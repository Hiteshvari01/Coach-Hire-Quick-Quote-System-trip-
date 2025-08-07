const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
require('dotenv').config();

const app = express();

// Middleware & View Setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// MongoDB Connection 
mongoose.connect("mongodb://localhost:27017/bus_booking")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Models

const TripQuote = require("./models/TripQuote");
const Stop = require("./models/Stop");
const tripTiming = require("./models/tripTiming");
const UserDetails = require("./models/UserDetails");

// Routes
app.get("/", (req, res) => {
  res.send("hi i am root");
});


const getDetailedTrips = async () => {
  const trips = await TripQuote.find({});
  return await Promise.all(trips.map(async (trip) => {
    const goingStops = await Stop.find({ tripId: trip._id, stopType: "going" });
    const returnStops = await Stop.find({ tripId: trip._id, stopType: "return" });
    const timing = await tripTiming.findOne({ tripId: trip._id });
    const user = await UserDetails.findOne({ tripId: trip._id });

    return { trip, goingStops, returnStops, timing, user };
  }));
};


app.get("/login", async (req, res) => {
  try {
    res.render("logInPage/index");
  } catch (err) {
    console.error("Error loading logInPage/index:", err);
    res.status(500).send("Something went wrong");
  }
});


app.post(["/1stLink","/dashboard"], async (req, res) => {
  try {
     console.log("Received login:", req.body);
    const detailedTrips = await getDetailedTrips();
    res.render("nav-item/1stLink", { detailedTrips });
  } catch (err) {
     console.log("Received login:", req.body);
    res.status(500).send("Something went wrong");
  }
});


app.get('/leads-details', async (req, res) => {
  try {
    const detailedTrips = await getDetailedTrips();
    res.render('nav-item/leads-details', { detailedTrips });
  } catch (err) {
    console.error("Error loading /lead-details:", err);
    res.status(500).send("Something went wrong");
  }
});



app.get("/trip", (req, res) => {
  res.render("1stPage");
});
app.get('/2ndLink', (req, res) => {
  res.render('nav-item/2ndLink'); 
});

app.get('/transactions', (req, res) => {
  res.render('nav-item/2ndLink'); 
});

app.get('/3rdLink', (req, res) => {
  res.render('nav-item/3rdLink'); 
});

app.get('/users', (req, res) => {
  res.render('nav-item/3rdLink'); 
});

app.get('/4thLink', (req, res) => {
  res.render('nav-item/4thLink'); 
});

app.get('/emailtemp', (req, res) => {
  res.render('nav-item/4thLink'); 
});
app.get('/5thLink', (req, res) => {
  res.render('nav-item/5thLink'); 
});

app.get('/ErchivedLead', (req, res) => {
  res.render('nav-item/5thLink'); 
});

app.get('/6thLink', (req, res) => {
  res.render('nav-item/6thLink'); 
});

app.get('/settings', (req, res) => {
  res.render('nav-item/6thLink'); 
});

app.post("/api/trip/start", async (req, res) => {
  
  try {
    const { tripType, pickupLocation, destinationLocation, numberOfPeople } = req.body;

    const newQuote = new TripQuote({
      tripType,
      pickupLocation,
      destinationLocation,
      numberOfPeople
    });

    await newQuote.save();

    res.render("2ndPage", {tripId: newQuote._id , tripType: tripType });
  } catch (err) {
    console.error("Error saving trip quote:", err);
    res.status(500).send("Something went wrong");
  }


});
app.get('/go-to-next', (req, res) => {
  const tripType = req.query.tripType;
  const { tripId} = req.query;
  res.render("3rdPage", { tripId, tripType }); // ✅ Pass tripType to EJS
});




app.post('/save-stops', async (req, res) => {
  const {tripId, location, duration, stopType,tripType = 'one-way'  } = req.body;

  if (!tripId || !location || !duration || !stopType) {
    return res.status(400).send("Missing trip or stop data");
  }

  const stopsData = [];
  //Yeh check karta hai ki location ek array hai ya nahi.
  //Agar location already array hai, to use as it is le lo.
  //Agar location ek single value hai, to usko ek array mein convert kar do (jaise [location]).
  const locations = Array.isArray(location) ? location : [location];
  const durations = Array.isArray(duration) ? duration : [duration];
  const stopTypes = Array.isArray(stopType) ? stopType : [stopType];

  for (let i = 0; i < locations.length; i++) {
    stopsData.push({
      tripId,
      location: locations[i],
      duration: parseInt(durations[i]),
      stopType: stopTypes[i] || 'going',
    });
  }

  try {
    await Stop.insertMany(stopsData);
    res.render("3rdPage", { tripId , tripType});
  } catch (err) {
    console.error("Error inserting stops:", err);
    res.status(500).send(err.message);
  }
});


app.post("/save-trip-timing", async (req, res) => {
  try {
    const { tripId, departureDate, departureTime, returnDate, returnTime, tripType } = req.body;

    const timing = new tripTiming({
      tripId,
      departureDate,
      departureTime,
      returnDate,
      returnTime
    });

    await timing.save();

    res.render("4thPage", { tripId, tripType });
  } catch (err) {
    console.error(err);
    res.status(500).send("Something went wrong");
  }
});

const twilio = require("twilio");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);

app.post("/submit-user-details", async (req, res) => {
  try {
    const {
      tripId,
      fullName,
      phoneNumber,
      email,
      additionalInfo,
      confirmedDetails,
      agreedToPrivacyPolicy,
    } = req.body;

    const confirmed = confirmedDetails === "on";
    const agreed = agreedToPrivacyPolicy === "on";

    const userDetails = new UserDetails({
      tripId,
      fullName,
      phoneNumber,
      email,
      additionalInfo,
      confirmedDetails: confirmed,
      agreedToPrivacyPolicy: agreed,
    });

    await userDetails.save();

    // ✅ Fetch related trip info
    const trip = await TripQuote.findById(tripId);
    const timing = await tripTiming.findOne({ tripId });

    // ✅ WhatsApp message
    const message = `🚌 *New Quote Request* \n${trip.pickupLocation} → ${trip.destinationLocation} | ${timing?.departureDate || 'N/A'}`;

    await client.messages.create({
      from: 'whatsapp:+14155238886', // Twilio sandbox
      to: 'whatsapp:+916269115002', // Must include country code (e.g., +91...)
      body: message
    });

    res.redirect(`/review/${tripId}`);
  } catch (err) {
    console.error("Error saving user details:", err);
    res.status(500).send("Something went wrong");
  }
});


// ✅ Final Review Page Route
app.get("/review/:tripId", async (req, res) => {
 
  try {
    const { tripId } = req.params;

    const trip = await TripQuote.findById(tripId);
    const goingStops = await Stop.find({ tripId, stopType: "going" });
    const returnStops = await Stop.find({ tripId, stopType: "return" });
    const timing = await tripTiming.findOne({ tripId });
    const user = await UserDetails.findOne({ tripId });

    res.render("reviewPage", {
      trip,
       goingStops,
      returnStops,
      timing,
      user
    });
  } catch (err) {
    console.error("Error fetching trip details:", err);
    res.status(500).send("Something went wrong");
  }
});

app.listen(8080, () => {
  console.log("Server is listening on port 8080");
});
