const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({

  busNumber:{
    type:String,
    required:true,
    unique:true,
    uppercase:true
  },

  capacity:{
    type:Number,
    default:40
  },

  busType:{
    type:String,
    enum:['AC','NON-AC','ELECTRIC'],
    default:'NON-AC'
  },

  assignedRoute:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'Route'
  },

  assignedDriver:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'User'
  },

  currentLocation:{
    lat:Number,
    lng:Number,
    lastUpdated:Date
  },

  status:{
    type:String,
    enum:['active','maintenance','inactive'],
    default:'active'
  }

},{timestamps:true});

module.exports = mongoose.model('Bus',busSchema);
