from google.appengine.ext import db

class Channel(db.Model):
    token = db.StringProperty()

class Hacker(db.Model):
    """ Individual hacker unit """
    first_name = db.StringProperty(required=True)
    last_name = db.StringProperty(required=True)
    catchphrase = db.StringProperty()
    user = db.StringProperty() #Facebook id of user
    talents = db.ListProperty(str) #List of acquired talents
    imageset = db.StringProperty() #Image set to use. TODO: Talk with sara about this!
    base_energy       = db.IntegerProperty()
    base_productivity = db.IntegerProperty()
    base_teamwork  = db.IntegerProperty() 
    
class Queue(db.Model):
    """ Queue for users in lobby """
    users = db.ListProperty(str)
    
class Match(db.Model):
    """ Necessary information for individual matches """
    project_id = db.StringProperty(required=True)
    users = db.ListProperty(str, required=True)
    created = db.DateTimeProperty(auto_now_add=True)
    outcome = db.ListProperty(int) # Index of stage/wave position
    hacker_list = db.ListProperty(str) #List of all participating hackers
    
class Project(db.Model):
    """ Contains all information  pertaining to a project graph """
    name = db.StringProperty(required = True)
    #TODO: Description?
    graph_json = db.StringProperty(required = True) #The entire graph data of the project, in JSON format
    mvp_effect = db.StringProperty() #TODO: Implement this!