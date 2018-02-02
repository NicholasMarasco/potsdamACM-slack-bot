var command_handler = require("./commandHandlers").command_handler;
var util = require("./util.js").util;

/**
 * Make a Bender appear
 * @param {RTMClient} rtm - rtm api client
 * @param {WebClient} web - web api client
 * @param {Object} opts - Bender options
 * @param {String} opts.bot_id - Id of the bot
 * @param {Object} opts.channel_ids - Ids of channels bot is a member of
 * @returns {Bender} gives a Bender
 * @constructor
 */
function Bender(rtm, web, opts){
  this.rtm = rtm;
  this.web = web;

  this.bot_id = opts.bot_id;
  this.channel_ids = opts.channel_ids;

  this.praises = 0;
  this.bank = {};
  this.heisters= {};
  this.games = ["COIN","ROLL"];
  this.commands = ["ROLL","JOIN","CHECKBUX","HELP","BET","COMMANDS","COIN","8BALL",
                   "FORTUNE","PICKIT","PRAISE"];
}

/**
 * Bender's welcome handler
 * @param {String} id - user id to welcome
 */
Bender.prototype.welcome = function welcome(id){
  var bot_msg = "Welcome to our Slack! :congaparrot:\n" +
                "Type <@" + this.bot_id + "> COMMANDS to get a list of bot commands!\n" +
                "Enjoy! :bender:";
  this._postMessage(id, bot_msg, this.channel_ids.general);
}

/**
 * Invoke Bender's message handler
 * @param {String} msg - incoming message text
 * @param {String} user - incoming user
 * @param {String} channel - incoming channel
 */
Bender.prototype.bend = function bend(msg, user, channel){

  //ignore non messages with no text
  if(typeof msg === 'undefined') return;

//   console.log(msg);

  var proc_msg = this._processMessage(msg.trim());
  var bot_msg;

  switch(proc_msg.type){

    case 0: // HI command
      bot_msg = "I'm a Bender. I bend girders. :partyparrot:";
      this._postMessage(user, bot_msg, channel);
      break;

    case 1: // ROLL command
      var roll_result = command_handler.rollHandler(proc_msg.die, proc_msg.times);
      bot_msg = roll_result.message;
      this._postMessage(user, bot_msg, channel);
      break;

    case 2: // JOIN command
      var join_opts = {};
      join_opts["channel_ids"] = this.channel_ids;
      join_opts["bank"] = this.bank;
      var join_result = command_handler.joinHandler(user, channel, join_opts);
      bot_msg = join_result.message;
      this._postMessage(user, bot_msg, channel);
      break;

    case 3: // CHECKBUX command
      var checkbux_opts = {};
      checkbux_opts["channel_ids"] = this.channel_ids;
      checkbux_opts["bank"] = this.bank;
      checkbux_opts["target"] = proc_msg.user;
      var checkbux_result = command_handler.checkbuxHandler(user, checkbux_opts);
      bot_msg = checkbux_result.message;
      this._postMessage(user, bot_msg, channel);
      break;

    case 4: // HELP command
      var help_opts = {};
      help_opts["commands"] = this.commands;
      help_opts["games"] = this.games;
      help_opts["channel_ids"] = this.channel_ids;
      help_opts["bot_id"] = this.bot_id;
      var help_result = command_handler.helpHandler(proc_msg.command,
                                                    proc_msg.sub_command,
                                                    help_opts);
      bot_msg = help_result.message;
      this._postMessage(user, bot_msg, channel);
      break;

    case 5: // BET command
      var bet_opts = {};
      bet_opts["channel_ids"] = this.channel_ids;
      bet_opts["game_data"] = proc_msg.game_data;
      bet_opts["bank"] = this.bank;
      bet_opts["games"] = this.games;
      var bet_result = command_handler.betHandler(user, channel, bet_opts);
      bot_msg = bet_result.message;
      this._postMessage(user, bot_msg, channel);
      break;

    case 6: // COMMANDS command
      bot_msg = "The current supported commands are: ";
      bot_msg += this.commands.join(", ");
      bot_msg += "\nUse <@" + this.bot_id + "> HELP <command-name> for details"
      this._postMessage(user, bot_msg, channel);
      break;

    case 7: // COIN
      var coin_result = command_handler.coinHandler();
      bot_msg = coin_result.message;
      this._postMessage(user, bot_msg, channel);
      break;

    case 8: // 8BALL
      var eightball_result = command_handler.eightballHandler();
      bot_msg = eightball_result.message;
      this._postMessage(user, bot_msg, channel);
      break;

    case 9: // FORTUNE
      var fortune_result = command_handler.fortuneHandler();
      bot_msg = fortune_result.message;
      this._postMessage(user, bot_msg, channel);
      break;

    case 10: // HEIST
      var args = {
        "rtm"         : this.rtm,
        "bank"        : this.bank,
        "heisters"    : this.heisters,
        "channel_ids" : this.channel_ids,
        "channel"     : channel,
        "user"        : user}

      // do this async
      //command_handler.heistHandler(args).then(function(result){});
      break;

    case 11: // PICKIT
      var pickit_ops = proc_msg.ops;
      var pickit_result = command_handler.pickitHandler(pickit_ops);
      bot_msg = pickit_result.message;
      this._postMessage(user, bot_msg, channel);
      break;

    case 12: // PRAISE
      var bot_msg = "Bender has been praised " + ++this.praises +
                    " times since last restart";
      this._postMessage(undefined, bot_msg, channel);
      break;

    case 13: // CHARACTER
      bot_msg = command_handler.characterHandler().message;
      this._postMessage(user, bot_msg, channel);
      break;

    default:
     if(typeof proc_msg.message !== 'undefined'){
        this._postMessage(user, proc_msg.message, channel);
      }
      return;
  }
}

/**
 * Process incoming message into command handler friendly objects
 * @param {String} msg - incoming message to process
 * @returns {Object} - object containing properties required by command handlers
 * @private
 */
Bender.prototype._processMessage = function _processMessage(msg){
  var result = {};
  msg = msg.split(" ");

  // Legacy "HI" command
  if(msg[0].toUpperCase() === "HI" && msg.length > 1){
    if(msg[1].toUpperCase() === "BENDER" || msg[1].includes(this.bot_id) ||
       msg[1].toUpperCase() === ":B:"    || msg[1].toUpperCase() === ":BENDER:") {
      result["type"] = 0;
    }
  }

  // Welcome thing
  else if(msg[0].toUpperCase() === "WELCOME" && msg.length == 1){
    result["type"] = 11;
  }

  // Start checking for real commands
  else if((msg[0].includes(this.bot_id) || msg[0].toUpperCase() === ":B:" ||
           msg[0].toUpperCase() === ":BENDER:") &&
           msg.length > 1){
    console.log("\nMention detected, checking for command..");

    // ROLL command
    if((msg[1].toUpperCase() === "ROLL" || msg[1].toUpperCase() === ":GAME_DIE:") &&
        msg.length > 2){
      console.log("Processing ROLL command...");
      result["type"] = 1;

      if(msg[2].toUpperCase() === "CHARACTER" || msg[2].toUpperCase() === "DRAGON"){
        result["type"] = 13;
        return result;
      }

      // this monstrosity hits all d cases
      if(/^((:[a-z0-9_-]+:)|\d+)?d((:[a-z0-9_-]+:)|\d+)$/i.test(msg[2])){
        var split_roll = util.memeSafeSplit(msg[2].toUpperCase(),"D");
        //console.log(split_roll);

        if(split_roll[0] === ''){ // dX roll
          result["times"] = 1;
        }
        else{ // YdX roll
          result["times"] = split_roll[0];
        }
        result["die"] = split_roll[1];

      }
      else{ // non d cases just toss it to the handler

        result["die"] = msg[2];
        result["times"] = "1";
      }
    }

    // JOIN command
    else if(msg[1].toUpperCase() === "JOIN"){
      console.log("Processing JOIN command...");
      result["type"] = 2;
    }

    // CHECKBUX command
    else if(msg[1].toUpperCase() === "CHECKBUX"){
      console.log("Processing CHECKBUX command...");
      result["type"] = 3;
      if(msg.length > 2){
        result["user"] = msg[2];
      }
    }

    // HELP command
    else if(msg[1].toUpperCase() === "HELP"){
      console.log("Processing HELP command...");
      if(msg.length > 2){
        result["command"] = msg[2];
      }
      if(msg.length > 3){
        result["sub_command"] = msg[3];
      }
      result["type"] = 4;
    }

    // BET command
    else if(msg[1].toUpperCase() === "BET"){
      console.log("Processing BET command...");
      result["type"] = 5;
      result["game_data"] = {};
      result.game_data["amount"] = msg[2];
      result.game_data["game"] = msg[3];
      result.game_data["ops"] = {};
      for(let i = 4; i < msg.length; i++){
        result.game_data.ops[("op" + (i-3))] = msg[i];
      }
    }

    // COMMANDS command
    else if(msg[1].toUpperCase() === "COMMANDS"){
      console.log("Processing COMMANDS command...");
      result["type"] = 6;
    }

    // COIN command
    else if(msg[1].toUpperCase() === 'COIN'){
      console.log("Processing COIN command...");
      result["type"] = 7;
    }

    // 8BALL command
    else if(msg[1].toUpperCase() === '8BALL' || msg[1].toUpperCase() === ':8BALL:'){
      console.log("Processing 8BALL command...");
      result["type"] = 8;
    }

    // FORTUNE command
    else if(msg[1].toUpperCase() === 'FORTUNE' ||
            msg[1].toUpperCase() === ':FORTUNE:'){
      console.log("Processing FORTUNE command...");
      result["type"] = 9;
    }

    // HEIST command
    else if(msg[1].toUpperCase() === 'HEIST'){
      console.log("Processing HEIST command...");
      result["type"] = 10;
    }

    // PICKIT command
    else if(msg[1].toUpperCase() === 'PICKIT'){
      console.log("Processing PICKIT command...");
      result["type"] = 11;
      result["ops"] = [];
      for(let i = 2; i < msg.length; i++){
        result.ops[i-2] = msg[i];
      }
      result.ops = util.quoteSafeSplit(result.ops.join(" ")," ");
//       console.log(result.ops + "<");
    }

    // PRAISE command
    else if(msg[1].toUpperCase() === 'PRAISE' || msg[1].toUpperCase() === ':PRAY:'){
      console.log("Processing PRAISE command...");
      result["type"] = 12;
    }

    // none found
    else{
      console.log("No command found");
    }

  }
  // Not a command or anything bot cares about
  else{
    result["type"] = -1;
  }

  return result;

}

/**
 * Make sending messages more simple
 * @param {String} user - user to notify
 * @param {String} message - message to notify with
 * @param {String} channel - where to post
 * @private
 */
Bender.prototype._postMessage = function _postMessage(user, message, channel){
  if(typeof user !== 'undefined'){
    this.rtm.sendMessage("<@" + user + "> " + message, channel);
  }
  else{
    this.rtm.sendMessage(message, channel);
  }
}

module.exports.Bender = Bender;
