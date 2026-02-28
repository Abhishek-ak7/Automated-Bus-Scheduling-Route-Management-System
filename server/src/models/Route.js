const mongoose = require('mongoose');

const routeStopSchema = new mongoose.Schema({
  stopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stop',
    required: true
  },
  sequence: {
    type: Number,
    required: true
  },
  distanceFromPrev: Number, // km
  timeFromPrev: Number // minutes
},{ _id:false });

const routeSchema = new mongoose.Schema({
  routeName: {
    type: String,
    required: true
  },

  routeCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },

  stops: [routeStopSchema],

  totalDistance: Number,

  estimatedDuration: Number,

  routeType: {
    type: String,
    enum: ['express','local','feeder'],
    default: 'local'
  },

  isActive:{
    type:Boolean,
    default:true
  }

},{ timestamps:true });

module.exports = mongoose.model('Route', routeSchema);
