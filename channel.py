from google.appengine.api import channel
import webapp2

def broadcast(msg, key):
    channel.send_message(key, msg)

class RequestChannelHandler(webapp2.RequestHandler):        
  #Add to UWSGI Handler list:  ('/requestChannel/([^/]+)?', RequestChannelHandler)
  def get(self, keyname):    
    token = channel.create_channel(str(chan.key()))
    self.response.out.write(json.dumps({"token": token}))

