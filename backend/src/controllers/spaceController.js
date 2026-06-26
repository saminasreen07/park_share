import ParkingSpace from '../models/ParkingSpace.js';
import OwnerWallet from '../models/OwnerWallet.js';
import axios from 'axios';

// Haversine distance calculator helper
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

// Create a new Parking Space
export const createSpace = async (req, res) => {
  try {
    const {
      title,
      description,
      address,
      latitude,
      longitude,
      pricePerHour,
      totalSlots,
      availability,
      features,
    } = req.body;

    if (!title || !address || !latitude || !longitude || !pricePerHour) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    // Double check wallet exists for this owner
    let wallet = await OwnerWallet.findOne({ ownerId: req.user._id });
    if (!wallet) {
      await OwnerWallet.create({ ownerId: req.user._id });
    }

    // Default sample image if none provided
    const images = req.body.images && req.body.images.length > 0
      ? req.body.images
      : ['https://images.unsplash.com/photo-1506521788701-1e13a4e83c2a?q=80&w=600&auto=format&fit=crop'];

    const newSpace = await ParkingSpace.create({
      ownerId: req.user._id,
      title,
      description,
      address,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      images,
      pricePerHour: parseFloat(pricePerHour),
      totalSlots: parseInt(totalSlots) || 1,
      availableSlots: parseInt(totalSlots) || 1,
      availability: availability || { isAlwaysAvailable: true },
      features: features || {},
      status: 'approved', // Auto-approving for development ease, admin can manage via admin panel
    });

    res.status(201).json({ success: true, message: 'Parking space listed successfully', data: newSpace });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all spaces (with basic filters)
export const getSpaces = async (req, res) => {
  try {
    const { status, minPrice, maxPrice, hasEVCharger } = req.query;
    const query = {};

    if (status) query.status = status;
    if (minPrice || maxPrice) {
      query.pricePerHour = {};
      if (minPrice) query.pricePerHour.$gte = parseFloat(minPrice);
      if (maxPrice) query.pricePerHour.$lte = parseFloat(maxPrice);
    }
    if (hasEVCharger === 'true') {
      query['features.hasEVCharger'] = true;
    }

    const spaces = await ParkingSpace.find(query).populate('ownerId', 'name rating phone');
    res.status(200).json({ success: true, count: spaces.length, data: spaces });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get nearby spaces using 2dsphere geo-query & rank them using AI Recommendation service
export const getNearbyAndRecommended = async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 10000, budget, rating } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Latitude and Longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // 1. Fetch nearby approved parking spaces from Database
    const spaces = await ParkingSpace.find({
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          $maxDistance: parseInt(maxDistance),
        },
      },
      status: 'approved',
    }).populate('ownerId', 'name rating phone');

    if (spaces.length === 0) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    // Format spaces for recommendation scoring
    const candidates = spaces.map((space) => {
      const dist = calculateDistance(lat, lng, space.location.coordinates[1], space.location.coordinates[0]);
      // Mock random traffic score between 1 (low) and 5 (high)
      const simulatedTrafficScore = Math.floor(Math.random() * 5) + 1;
      // Simulated peak hours active status (busy factor)
      const hour = new Date().getHours();
      const isPeakHour = (hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 20) ? 1 : 0;

      return {
        id: space._id.toString(),
        title: space.title,
        price: space.pricePerHour,
        rating: space.averageRating || 4.0,
        distance: dist, // in km
        traffic: simulatedTrafficScore,
        peak_hour: isPeakHour,
        has_ev: space.features.hasEVCharger ? 1 : 0,
        object: space, // keep a reference to mongo document
      };
    });

    // 2. Call Python AI microservice for recommendations
    let recommendedList = [];
    let usedAI = false;

    const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    try {
      const response = await axios.post(`${aiUrl}/recommend`, {
        driver_coords: [lat, lng],
        budget: budget ? parseFloat(budget) : 100.0,
        min_rating: rating ? parseFloat(rating) : 3.0,
        candidates: candidates.map(c => ({
          id: c.id,
          price: c.price,
          rating: c.rating,
          distance: c.distance,
          traffic: c.traffic,
          peak_hour: c.peak_hour,
          has_ev: c.has_ev
        }))
      }, { timeout: 3000 }); // 3 second timeout

      if (response.data && response.data.success) {
        const sortedIds = response.data.recommendations.map(r => r.id);
        const scoresMap = {};
        response.data.recommendations.forEach(r => {
          scoresMap[r.id] = r.confidence_score;
        });

        // Reorder MongoDB documents according to AI response ranking
        recommendedList = sortedIds.map(id => {
          const match = candidates.find(c => c.id === id);
          if (match) {
            const doc = match.object.toObject();
            doc.distance = match.distance;
            doc.aiScore = scoresMap[id];
            doc.trafficScore = match.traffic;
            return doc;
          }
          return null;
        }).filter(item => item !== null);

        usedAI = true;
      }
    } catch (aiErr) {
      console.warn('AI Recommendation service unavailable. Falling back to local scoring algorithm:', aiErr.message);
    }

    // 3. Fallback: JavaScript scoring calculation if AI server is down
    if (!usedAI) {
      recommendedList = candidates.map(c => {
        // Simple weights: rating (30%), price (30%), distance (30%), traffic/peak (10%)
        // High rating = good, low price = good, low distance = good, low traffic = good
        const normRating = c.rating / 5.0;
        const normPrice = Math.max(0, 1 - (c.price / 150.0)); // Assume 150 is high price
        const normDist = Math.max(0, 1 - (c.distance / (maxDistance / 1000.0))); // Normalized distance
        const normTraffic = Math.max(0, 1 - (c.traffic / 5.0));

        let localScore = (normRating * 0.3) + (normPrice * 0.3) + (normDist * 0.3) + (normTraffic * 0.1);
        
        // Boost if EV charger is available and driver requested it (mock driver preference)
        if (c.has_ev) localScore += 0.05;
        
        const doc = c.object.toObject();
        doc.distance = c.distance;
        doc.aiScore = Math.min(1.0, localScore);
        doc.trafficScore = c.traffic;
        return doc;
      });

      // Sort descending by score
      recommendedList.sort((a, b) => b.aiScore - a.aiScore);
    }

    res.status(200).json({
      success: true,
      count: recommendedList.length,
      aiEngine: usedAI ? 'Python_FastAPI_ML' : 'Local_Fallback_Formula',
      data: recommendedList
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single space by ID
export const getSpaceById = async (req, res) => {
  try {
    const space = await ParkingSpace.findById(req.params.id).populate('ownerId', 'name rating phone avatar');
    if (!space) {
      return res.status(404).json({ success: false, message: 'Parking space not found' });
    }
    res.status(200).json({ success: true, data: space });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get currently logged-in Owner's spaces
export const getOwnerSpaces = async (req, res) => {
  try {
    const spaces = await ParkingSpace.find({ ownerId: req.user._id });
    res.status(200).json({ success: true, count: spaces.length, data: spaces });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle space availability
export const toggleAvailability = async (req, res) => {
  try {
    const space = await ParkingSpace.findOne({ _id: req.params.id, ownerId: req.user._id });

    if (!space) {
      return res.status(404).json({ success: false, message: 'Parking space not found or not owned by you' });
    }

    space.availability.isAlwaysAvailable = !space.availability.isAlwaysAvailable;
    await space.save();

    res.status(200).json({
      success: true,
      message: `Space is now ${space.availability.isAlwaysAvailable ? 'Available' : 'Unavailable'}`,
      data: space,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update space details
export const updateSpace = async (req, res) => {
  try {
    const { title, description, address, location, pricePerHour, totalSlots, features, images } = req.body;
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (address) updateData.address = address;
    if (location) updateData.location = location;
    if (pricePerHour) updateData.pricePerHour = pricePerHour;
    if (totalSlots) updateData.totalSlots = totalSlots;
    if (features) updateData.features = features;
    if (images) updateData.images = images;

    const space = await ParkingSpace.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!space) {
      return res.status(404).json({ success: false, message: 'Parking space not found or not owned by you' });
    }

    res.status(200).json({ success: true, message: 'Parking space updated successfully', data: space });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete space
export const deleteSpace = async (req, res) => {
  try {
    const space = await ParkingSpace.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id });

    if (!space) {
      return res.status(404).json({ success: false, message: 'Parking space not found or not owned by you' });
    }

    res.status(200).json({ success: true, message: 'Parking space deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
