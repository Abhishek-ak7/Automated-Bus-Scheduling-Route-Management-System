const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({

  schedule:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Schedule',
    required:true
  },

  route:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Route'
  },

  bus:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Bus'
  },

  plannedStartTime:{
    type:Date,
    required:true
  },

  actualStartTime:Date,

  plannedEndTime:Date,

  actualEndTime:Date,

  status:{
    type:String,
    enum:['scheduled','running','completed','cancelled'],
    default:'scheduled'
  },

  delayMinutes:{
    type:Number,
    default:0
  }

},{timestamps:true});

module.exports = mongoose.model('Trip',tripSchema);
