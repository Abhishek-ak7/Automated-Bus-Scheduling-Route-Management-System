const mongoose = require('mongoose');
require('dotenv').config();

async function setup() {
  await mongoose.connect(process.env.MONGO_URI);

  require('./src/models/Stop');
  require('./src/models/Route');
  require('./src/models/Bus');
  require('./src/models/Trip');
  require('./src/models/Schedule');

  const Stop     = mongoose.model('Stop');
  const Route    = mongoose.model('Route');
  const Trip     = mongoose.model('Trip');

  const busId      = '69a5a4d560cdc5a028508cc4';
  const routeId    = '69a6994d48d98d5d872d3781';
  const scheduleId = '69a69c3148d98d5d872d3786';

  // 1. Create intermediate stops along LPU → Jalandhar path
  const stop1 = await Stop.findOneAndUpdate(
    { stopCode: 'PHG' },
    { stopName: 'Phagwara Bypass', stopCode: 'PHG', location: { lat: 31.2717, lng: 75.6728 }, isActive: true },
    { upsert: true, new: true }
  );
  console.log('Stop:', stop1.stopName, stop1._id);

  const stop2 = await Stop.findOneAndUpdate(
    { stopCode: 'NKD' },
    { stopName: 'Nakodar Chowk', stopCode: 'NKD', location: { lat: 31.2898, lng: 75.6406 }, isActive: true },
    { upsert: true, new: true }
  );
  console.log('Stop:', stop2.stopName, stop2._id);

  const stop3 = await Stop.findOneAndUpdate(
    { stopCode: 'KRT' },
    { stopName: 'Kartarpur Turn', stopCode: 'KRT', location: { lat: 31.3079, lng: 75.6084 }, isActive: true },
    { upsert: true, new: true }
  );
  console.log('Stop:', stop3.stopName, stop3._id);

  // 2. Get existing stop IDs
  const lpuStop = await Stop.findOne({ stopName: /LPU/i });
  const jalStop = await Stop.findOne({ stopName: /Jalandhar/i });
  console.log('LPU:', lpuStop._id, '| Jalandhar:', jalStop._id);

  // 3. Update route R200 with 5 stops in sequence
  await Route.findByIdAndUpdate(routeId, {
    stops: [
      { stopId: lpuStop._id,  sequence: 1, distanceFromPrev: 0, timeFromPrev: 0 },
      { stopId: stop1._id,    sequence: 2, distanceFromPrev: 4, timeFromPrev: 5 },
      { stopId: stop2._id,    sequence: 3, distanceFromPrev: 4, timeFromPrev: 5 },
      { stopId: stop3._id,    sequence: 4, distanceFromPrev: 4, timeFromPrev: 5 },
      { stopId: jalStop._id,  sequence: 5, distanceFromPrev: 4, timeFromPrev: 5 },
    ],
    totalDistance: 16,
    estimatedDuration: 20
  });
  console.log('Route R200 updated with 5 stops');

  // 4. Cancel all old trips for this bus
  await Trip.updateMany(
    { bus: busId, status: { $in: ['running', 'scheduled'] } },
    { status: 'cancelled' }
  );
  console.log('Old trips cancelled');

  // 5. Create a new scheduled trip (planned = now + 2 min)
  const planned = new Date(Date.now() + 2 * 60000);
  const trip = await Trip.create({
    schedule: scheduleId,
    route: routeId,
    bus: busId,
    plannedStartTime: planned,
    status: 'scheduled'
  });
  console.log('\n✅ New scheduled trip created:', trip._id);
  console.log('   Planned start:', planned.toISOString());
  console.log('\n🚀 Start server + driver.js now!');

  await mongoose.disconnect();
}

setup().catch(e => { console.error(e); process.exit(1); });
