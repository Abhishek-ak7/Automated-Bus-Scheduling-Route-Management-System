const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  stopName: {
    type: String,
    required: true,
    trim: true
  },

  stopCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },

  location: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    }
  },

  routes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route'
  }],

  facilities: [{
    type: String,
    enum: ['shelter','bench','toilet','atm']
  }],

  isActive: {
    type: Boolean,
    default: true
  }

},{ timestamps: true });

/* Geo index (VERY IMPORTANT for nearby search later) */
stopSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Stop', stopSchema);
