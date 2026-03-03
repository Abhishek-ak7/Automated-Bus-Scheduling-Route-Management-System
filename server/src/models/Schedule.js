const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({

  route:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Route',
    required:true
  },

  bus:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Bus',
    required:true
  },

  startTime:{
    type:String, // "08:00"
    required:true
  },

  endTime:{
    type:String, // "22:00"
    required:true
  },

  frequency:{
    type:Number, // minutes
    required:true
  },

  daysOfOperation:[{
    type:String,
    enum:['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  }],

  isActive:{
    type:Boolean,
    default:true
  }

},{timestamps:true});

module.exports = mongoose.model('Schedule',scheduleSchema);
