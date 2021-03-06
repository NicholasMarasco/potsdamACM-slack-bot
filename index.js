require('dotenv').config();
// Api imports
var RtmClient = require('@slack/client').RtmClient;
var WebClient = require('@slack/client').WebClient;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;

// Bender import
var Bender = require('./bender.js').Bender;

// bot token excluded from public repository for safety reasons
var bot_token = process.env.SLACK_BOT_TOKEN || '';
console.log("Token connected with: " + bot_token);

// Create clients to make api calls
var rtm = new RtmClient(bot_token);
var web = new WebClient(bot_token);

var bender_opts = {};
// Channel ids
var channel_ids = {};

var bender;

/*****************************************************************************/
/* Authenticate to Slack                                                     */
/* Get bot id and the ids of channels bot is a member of                     */
/*****************************************************************************/
rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
  bender_opts["bot_id"] = rtmStartData.self.id;
  console.log("Name/ID: " + bender_opts.bot_id);

  for (const c of rtmStartData.channels) {
    if (c.is_member){
      console.log("Member of channel: " + c.name);
      channel_ids[c.name] = c.id;
      //console.log(channel_ids[c.name]);
    }
  }
  bender_opts["channel_ids"] = channel_ids;
  console.log("Logged in as " + rtmStartData.self.name +
              " of team " + rtmStartData.team.name +
              ", but not yet connected to channel");
});

/*****************************************************************************/
/* Successfully connected to RTM                                             */
/*****************************************************************************/
rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function() {
  console.log("RTM connection opened successfully\n\n");
  bender = new Bender(rtm, web, bender_opts);
  //rtm.sendMessage("New Bender, who dis?",channel_ids.bender_dev);
});

// Start up the rtm
rtm.start();

/*****************************************************************************/
/* Team join handler                                                         */
/*****************************************************************************/
rtm.on(RTM_EVENTS.TEAM_JOIN, function handleTeamJoin(evnt){
  bender.welcome(evnt.user.id);
});

/*****************************************************************************/
/* Message event handler                                                     */
/*****************************************************************************/
rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {

  if(message.subtype === "message_changed"){
    bender.bend(message.message.text,message.message.user,message.channel);
  }
  else{
    bender.bend(message.text, message.user, message.channel);
  }
});

/*****************************************************************************/
/* Reaction added event handler                                              */
/*****************************************************************************/
rtm.on(RTM_EVENTS.REACTION_ADDED, function handleReactionAdded(evnt) {
  if(evnt.user == bender_opts.bot_id){
    return;
  }

  console.log("\n" + evnt.reaction + " added to " +
	                   evnt.item.type + " by " +
	                   evnt.user);
  //console.log(evnt.item);

  var item = {
    file         : evnt.item.file,
    file_comment : evnt.item.file_comment,
    channel      : evnt.item.channel,
    timestamp    : evnt.item.ts,
    ts           : evnt.item.ts};

  //console.log("channel: " + item.channel + "\nts: " + item.ts);
  //console.log(item);

  web.reactions.add(evnt.reaction,item, function handleAdd(err,res){
    if(err){ console.log("channel: " + item.channel + "\n" +
                         "ts     : " + item.timestamp + "\n\n" + err);}
    else{ console.log("Posted successfully"); }
  });
});
