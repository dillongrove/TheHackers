#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
import datetime
import logging
import webapp2
import json
import urllib
import random
from facebook import *

from google.appengine.api import users
from google.appengine.ext.webapp import template
from facebook import FBRequestHandler
from models import Hacker, Queue, Match, Project, Channel
from channel import broadcast, RequestChannelHandler
from google.appengine.api import channel

#TODO: Investigate JS templating?
#template.register_template_library('verbatimtemplatetag')

def broadcast(match, msg):
    for user in match.users:
        channel.send_message(user, msg)

def message(user, msg):
    channel.send_message(user, msg)

def initChannel(userid):
    #Refreshes the channel api
    chan = Channel.get_by_key_name(userid)
    if not chan:
        chan = Channel(key_name = userid)
    chan.token = channel.create_channel(userid, duration_minutes=5)
    chan.put()
    return chan.token

def getCurrentMatchByUser(current_user_id):
    #Gets the match the user is currently participating in, or None if no match started.
    #TODO: Check & Confirm creation order
    hackathon = Match.all().filter("users =", current_user_id).order("-created").get()
    if not hackathon or (100 in hackathon.outcome): #Most recent is nonexistant or completed
        return None
    return hackathon

# -------------- Template pages -----------------

class HomepageHandler(webapp2.RequestHandler):
    def get(self):
        path = os.path.join(os.path.dirname(__file__), 'homepage.html')
        self.response.out.write(template.render(path, {}))

class CreationHandler(FBRequestHandler):
    """ Handles initial generation of hackers for user selection """
    def get(self):
        self._current_user = self.require_login()
        if not self._current_user:
            self.authenticate()
            return

        self._current_user.hackers = Hacker.all().filter("user =", self._current_user.id).fetch(1000)

        path = os.path.join(os.path.dirname(__file__), 'create.html')
        self.response.out.write(template.render(path, {"user": self._current_user}))

class LoadoutHandler(FBRequestHandler):
    def get(self):
        self._current_user = self.require_login()
        if not self._current_user:
            self.authenticate()
            return

        token = initChannel(self._current_user.id)
        #Resolve hackers for this user
        self._current_user.hackers = Hacker.all().filter("user =", self._current_user.id).fetch(1000)

        if len(self._current_user.hackers) == 0:
            self.redirect("/create")

        path = os.path.join(os.path.dirname(__file__), 'loadout.html')
        self.response.out.write(template.render(path, {"user": self._current_user, "token": token}))

class HackathonHandler(FBRequestHandler):
    def get(self):
        self._current_user = self.require_login()
        if not self._current_user:
            self.authenticate()
            return

        match = getCurrentMatchByUser(self._current_user.id)
        if not match:
            self.redirect("/loadout")
            return

        #Resolve hacker ids to actual hacker data
        hacker_list = {}
        for hacker in match.hacker_list:
            hacker_instance = Hacker.get(hacker)
            hacker_list[str(hacker_instance.key())] = {"first_name": hacker_instance.first_name,
                             "last_name": hacker_instance.last_name,
                             "talents": hacker_instance.talents,
                             "imgset": hacker_instance.imageset,
                             "base": {"energy": hacker_instance.base_energy,
                                      "productivity": hacker_instance.base_productivity,
                                      "teamwork": hacker_instance.base_teamwork}}

        #Resolve hackers for this user
        self._current_user.hackers = Hacker.all().filter("user =", self._current_user.id).fetch(1000)

        #Resolve project
        project = Project.get(match.project_id)

        #Resolve users
        users = [User.get_by_key_name(id) for id in match.users]

        #Start appengine channel
        token = initChannel(self._current_user.id)

        path = os.path.join(os.path.dirname(__file__), 'hackathon.html')
        self.response.out.write(template.render(path, {"user": self._current_user,
                                                        "users": users,
                                                        "hackathon": match,
                                                        "hackers": json.dumps(hacker_list),
                                                        "project": project,
                                                        "token": token}))



# -------------- API calls ----------------
class API_CreateHackerHandler(FBRequestHandler):
    def get(self):
        self._current_user = self.require_login()
        if not self._current_user:
            self.response.out.write(json.dumps({"error": "please log in"}))
            return

        newhacker = Hacker(first_name = self.request.get("first_name"),
                           last_name = self.request.get("last_name"),
                           user = self._current_user.id,
                           catchphrase = self.request.get("catchphrase"),
                           imageset = self.request.get("image"),
                           level = 1,
                           base_energy = int(self.request.get("energy")),
                           base_productivity = int(self.request.get("productivity")),
                           base_teamwork = int(self.request.get("teamwork")))
        if self.request.get("clss"):
            newhacker.talents = [self.request.get("clss")]
        newhacker.put()
        self.response.out.write(json.dumps({"success": "new hacker created"}))

class API_NodeCompletedHandler(FBRequestHandler):
    def get(self, progress):
        self._current_user = self.require_login()
        if not self._current_user:
            self.response.out.write(json.dumps({"error": "please log in"}))
            return

        match = getCurrentMatchByUser(self._current_user.id)
        if not match:
            self.response.out.write(json.dumps({"error": "couldn't find current match"}))
            return

        #Update the match data
        userindex = match.users.index(self._current_user.id)
        match.outcome[userindex] = int(progress)
        match.put()

        #Notify all participating users
        broadcast(match, json.dumps({"progress": match.outcome}))

        self.response.out.write(json.dumps({"success": "node completed"}))

class API_LobbyHandler(FBRequestHandler):
    def get(self):
        self._current_user = self.require_login()
        if not self._current_user:
            self.response.out.write(json.dumps({"error": "please log in"}))
            return

        q = Queue.all().get()
        if not q:
            q = Queue()

        #Push onto queue
        if str(self._current_user.id) in q.users:
            self.response.out.write(json.dumps({"success": "already in queue"}))
        elif len(q.users) == 0:
            q.users = [self._current_user.id]
            self.response.out.write(json.dumps({"success": "added to queue"}))
        else: #Found a match. Pop & Serve
            matched = q.users[0]
            q.users = q.users[1:]

            #Randomly choose a project
            projects = Project.all().fetch(1000)
            random.seed()
            project = random.choice(projects)

            #Actually create the match
            match = Match(project_id = str(project.key()),
                          users = [self._current_user.id, matched],
                          outcome = [0, 0])

            hackers = Hacker.all().filter("user IN", match.users).fetch(8)
            match.hacker_list = []
            for hacker in hackers:
                match.hacker_list.append(str(hacker.key()))

            match.put()

            #Notify the users via socket
            broadcast(match, json.dumps({"success": "match found"}))
            self.response.out.write("herp")
        q.put()


class API_LevelupHandler(FBRequestHandler):
    def get(self, hacker_id, skill):

        self._current_user = self.require_login()
        if not self._current_user:
            self.response.out.write(json.dumps({"error": "please log in"}))
            return

        hacker = Hacker.get_by_id(hacker_id)
        if not hacker or hacker.user != self._current_user.id:
            self.response.out.write(json.dumps({"error": "could not find hacker or hacker not owned by you"}))
            return

        hacker.talents.append(skill)
        hacker.put()
        self.response.out.write(json.dumps({"success": "level up successful"}))


class API_PopulateDatastoreHandler(FBRequestHandler):
    def get(self):
        #Wipe datastore of all projects
        projs = Project.all().fetch(1000)
        for proj in projs:
            proj.delete()

        Project(name="Sendery", graph_json = "asdf", mvp_effect = "lasers").put()

        self.response.out.write("done")

class API_EatFoodHandler(FBRequestHandler):
    def get(self, food):
        self._current_user = self.require_login()
        if not self._current_user:
            self.response.out.write(json.dumps({"error": "please log in"}))
            return

        match = getCurrentMatchByUser(self._current_user.id)
        if not match:
            self.response.out.write(json.dumps({"error": "couldn't find current match"}))
            return
        
        foodIndex = ["pizza", "soda", "coffee"].index(food)
        
        if (match.food_stockpile[foodIndex] > 0):
            match.food_stockpile[foodIndex] -= 1
            match.put()
            self.response.out.write(json.dumps({"success": food}))
            broadcast(match, json.dumps({"food": match.food_stockpile}))
        else:
            self.response.out.write(json.dumps({"error": "this food not available"}))

class API_AddFoodHandler(FBRequestHandler):
    def get(self):
        self._current_user = self.require_login()
        if not self._current_user:
            self.response.out.write(json.dumps({"error": "please log in"}))
            return

        match = getCurrentMatchByUser(self._current_user.id)
        if not match:
            self.response.out.write(json.dumps({"error": "couldn't find current match"}))
            return
            
        in_stock = match.food_stockpile 
        MAX_STOCK = [3, 4, 2]
        
        match.food_stockpile = [random.randint(in_stock[0], MAX_STOCK[0]),
                                random.randint(in_stock[1], MAX_STOCK[1]),
                                random.randint(in_stock[2], MAX_STOCK[2])]
        match.put()
        
        broadcast(match, json.dumps({"food": match.food_stockpile}))
        self.response.out.write(json.dumps({"success": "food added"}))
        


class ChannelTestHandler(webapp2.RequestHandler):
    def get(self):
        for chan in Channel.all().fetch(1000):
            channel.send_message(chan.key().name(),"hi")
            self.response.out.write(str(chan.key().name())+"<br>")

class DBCleanHandler(webapp2.RequestHandler):
    def get(self):
        for h in Hacker.all().fetch(1000):
            h.delete()
        for m in Match.all().fetch(1000):
            m.delete()
        self.response.out.write("Datastore cleared of matches & hackers");

            
app = webapp2.WSGIApplication([
    ('/', HomepageHandler),
    ('/create', CreationHandler),
    ('/recruit', API_CreateHackerHandler),
    ('/loadout', LoadoutHandler),
    ('/hackathon', HackathonHandler),
    ('/hackathon/node_done/(\d+)', API_NodeCompletedHandler),
    ('/hackathon/find', API_LobbyHandler),
    ('/hacker/(\w+)/levelup/(\w+)', API_LevelupHandler),
    ('/test/populateDatastore', API_PopulateDatastoreHandler),
    ('/hackathon/eat/(\w+)', API_EatFoodHandler),
    ('/hackathon/addFood', API_AddFoodHandler),
    ('/test/channelTest', ChannelTestHandler),
    ('/test/bork', DBCleanHandler)
], debug=True)

def main():
    # Set the logging level in the main function
    # See the section on Requests and App Caching for information on how
    # App Engine reuses your request handlers when you specify a main function
    logging.getLogger().setLevel(logging.DEBUG)
    webapp.util.run_wsgi_app(application)

if __name__ == '__main__':
    main()