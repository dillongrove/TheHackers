from google.appengine.ext import db
import urllib
import cgi
import json
import os

FACEBOOK_APP_ID = "431863773541109"
FACEBOOK_APP_SECRET = "e9d336e51cd31cd5392100fba27d8924"


def authorize_url(returnURL):
    args = dict(client_id=FACEBOOK_APP_ID, redirect_uri=returnURL)
    return "https://graph.facebook.com/oauth/authorize?" + urllib.urlencode(args)

def access_token_request(code, returnURL):
    args = dict(client_id=FACEBOOK_APP_ID, redirect_uri=returnURL)
    """redirect_url points to */login* URL of our app"""
    args["client_secret"] = FACEBOOK_APP_SECRET  #facebook APP Secret
    args["code"] = code
    response = cgi.parse_qs(urllib.urlopen(
        "https://graph.facebook.com/oauth/access_token?" +
        urllib.urlencode(args)).read())
    access_token = response["access_token"][-1]
    return access_token
    
def loadProfile(self, access_token):
    profile = json.load(urllib.urlopen(
        "https://graph.facebook.com/me?" +
        urllib.urlencode({'access_token': access_token,
                          'fields': 'id,name,link'})))
    user_from_db = User.get_by_key_name(str(profile["id"]))
    if (user_from_db):
        user_from_db.name           = profile["name"]
        user_from_db.access_token   = access_token
        user_from_db.profile_url    = profile["link"]
        user_from_db.put()
        return user_from_db
    else:
        user = User(key_name=str(profile["id"]), id=str(profile["id"]),
                    name=profile["name"], access_token=access_token,
                    profile_url=profile["link"])
        user.put()
        return user

def loadFriendlist(user):
    friendList = json.load(urllib.urlopen(
        "https://graph.facebook.com/me/friends?" +
        urllib.urlencode({'access_token': user.access_token})))        
    return friendList
    
def setCookie(self, user):
    self.set_cookie("fb_user", str(user.id), expires=datetime.datetime.fromtimestamp(time.time() + 30 * 86400))
    
def getCurrentUser(self):
    user_id = self.get_cookie("fb_user")
    if user_id:
        return User.get_by_key_name(user_id)
    return None
    
def logout(self):
    self.set_cookie("fb_user", "", expires=datetime.datetime.fromtimestamp(time.time() - 86400))
    
class User(db.Model):
    """User Model Class"""
    id = db.StringProperty(required=True) #facebook user-id
    created = db.DateTimeProperty(auto_now_add=True)
    updated = db.DateTimeProperty(auto_now=True)
    name = db.StringProperty(required=True)
    profile_url = db.StringProperty(required=True)
    access_token = db.StringProperty(required=True)  #fb OAUTH access token
    
    
from google.appengine.ext import webapp

import Cookie
import base64
import time
import hashlib
import hmac
import datetime
import re
import calendar
import email.utils #TODO: Remove this? What does this do?
import logging
    
def _utf8(s):
    if isinstance(s, unicode):
        return s.encode("utf-8")
    assert isinstance(s, str)
    return s

def _unicode(s):
    if isinstance(s, str):
        try:
            return s.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPError(400, "Non-utf8 argument")
    assert isinstance(s, unicode)
    return s 

def _time_independent_equals(a, b):
    if len(a) != len(b):
        return False
    result = 0
    for x, y in zip(a, b):
        result |= ord(x) ^ ord(y)
    return result == 0
    
class FBRequestHandler(webapp.RequestHandler):
    """Extends the Google App Engine webapp.RequestHandler."""
    
    def require_login(self):
        if self.request.get("code"):
            access_token = access_token_request(self.request.get("code"), self.request.path_url)
            _current_user = loadProfile(self, access_token)
            setCookie(self, _current_user)
        else:
            _current_user = getCurrentUser(self)
        return _current_user
    
    def authenticate(self):
        self.redirect(authorize_url(self.request.path_url))
        
    def clear_cookie(self,name,path="/",domain=None):
        """Deletes the cookie with the given name."""
        expires = datetime.datetime.utcnow() - datetime.timedelta(days=365)
        self.set_cookie(name,value="",path=path,expires=expires,
                        domain=domain)    

    def clear_all_cookies(self):
        """Deletes all the cookies the user sent with this request."""
        for name in self.cookies.iterkeys():
            self.clear_cookie(name)            

    def cookies(self):
        """A dictionary of Cookie.Morsel objects."""
        if not hasattr(self,"_cookies"):
            self._cookies = Cookie.BaseCookie()
            if "Cookie" in self.request.headers:
                try:
                    self._cookies.load(self.request.headers["Cookie"])
                except:
                    self.clear_all_cookies()
        return self._cookies

    def _cookie_signature(self,*parts):
        """Hashes a string based on a pass-phrase."""
        hash = hmac.new("MySecretPhrase",digestmod=hashlib.sha1)
        for part in parts:hash.update(part)
        return hash.hexdigest() 

    def get_cookie(self,name,default=None):
        """Gets the value of the cookie with the given name,else default."""
        if name in self.request.cookies:
            return self.request.cookies[name]
        return default

    def set_cookie(self,name,value,domain=None,expires=None,path="/",expires_days=None):
        """Sets the given cookie name/value with the given options."""
        name = _utf8(name)
        value = _utf8(value)
        if re.search(r"[\x00-\x20]",name + value): # Don't let us accidentally inject bad stuff
            raise ValueError("Invalid cookie %r:%r" % (name,value))
        new_cookie = Cookie.BaseCookie()
        new_cookie[name] = value
        if domain:
            new_cookie[name]["domain"] = domain
        if expires_days is not None and not expires:
            expires = datetime.datetime.utcnow() + datetime.timedelta(days=expires_days)
        if expires:
            timestamp = calendar.timegm(expires.utctimetuple())
            new_cookie[name]["expires"] = email.utils.formatdate(timestamp,localtime=False,usegmt=True)
        if path:
            new_cookie[name]["path"] = path
        for morsel in new_cookie.values():
            self.response.headers.add_header('Set-Cookie',morsel.OutputString(None))

    def set_secure_cookie(self,name,value,expires_days=30,**kwargs):
        """Signs and timestamps a cookie so it cannot be forged"""
        timestamp = str(int(time.time()))
        value = base64.b64encode(value)
        signature = self._cookie_signature(name,value,timestamp)
        value = "|".join([value,timestamp,signature])
        self.set_cookie(name,value,expires_days=expires_days,**kwargs)

    def get_secure_cookie(self,name,include_name=True,value=None):
        """Returns the given signed cookie if it validates,or None"""
        if value is None:value = self.get_cookie(name)
        if not value:return None
        parts = value.split("|")
        if len(parts) != 3:return None
        if include_name:
            signature = self._cookie_signature(name,parts[0],parts[1])
        else:
            signature = self._cookie_signature(parts[0],parts[1])
        if not _time_independent_equals(parts[2],signature):
            logging.warning("Invalid cookie signature %r",value)
            return None
        timestamp = int(parts[1])
        if timestamp < time.time() - 31 * 86400:
            logging.warning("Expired cookie %r",value)
            return None
        try:
            return base64.b64decode(parts[0])
        except:
            return None