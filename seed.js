const mongoose = require('mongoose');
<<<<<<< HEAD
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

=======
const dotenv = require('dotenv');
>>>>>>> 46f2de843b6792b1d9aa613787ea1ee9a55de4b4
dotenv.config();

const User = require('./models/User');
const Property = require('./models/Property');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

<<<<<<< HEAD
  // Clear existing
  await User.deleteMany({});
  await Property.deleteMany({});

  // Create users
  const adminPass = await bcrypt.hash('admin123', 12);
  const agentPass = await bcrypt.hash('agent123', 12);
  const buyerPass = await bcrypt.hash('buyer123', 12);

  const admin = await User.create({ name: 'Admin User', email: 'admin@realvista.pk', password: adminPass, role: 'admin', phone: '+92 300 0000000' });
  const agent1 = await User.create({ name: 'Ali Hassan', email: 'agent@realvista.pk', password: agentPass, role: 'agent', phone: '+92 321 1234567', bio: 'Experienced real estate agent with 10+ years in Lahore market, specializing in DHA and Gulberg areas.' });
  const agent2 = await User.create({ name: 'Sara Ahmed', email: 'sara@realvista.pk', password: agentPass, role: 'agent', phone: '+92 333 9876543', bio: 'Top-performing agent in Karachi with expertise in luxury properties and commercial real estate.' });
  await User.create({ name: 'Buyer User', email: 'buyer@realvista.pk', password: buyerPass, role: 'buyer', phone: '+92 300 1111111' });

  console.log('✅ Users created');

  // Create properties
  const properties = [
    { title: 'Stunning 4-Bedroom House in DHA Phase 5 Lahore', description: 'A beautiful, well-maintained 4-bedroom house located in the prestigious DHA Phase 5 area of Lahore. Features modern architecture, spacious rooms, and a lovely garden. Perfect for families looking for comfort and luxury.', price: 45000000, type: 'house', status: 'sale', bedrooms: 4, bathrooms: 3, area: 4000, location: { address: 'Street 12, Block B, DHA Phase 5', city: 'Lahore', state: 'Punjab', country: 'Pakistan' }, features: ['Parking', 'Garden', 'Security', 'Generator', 'Gas', 'Electricity'], agent: agent1._id, isApproved: true, isFeatured: true, views: 245 },
    { title: 'Modern Apartment in Gulberg 3 - Ready to Move', description: 'A fully furnished, modern apartment in the heart of Gulberg 3. Close to all major amenities, restaurants, and shopping centers. Ideal for professionals and small families.', price: 18000000, type: 'apartment', status: 'sale', bedrooms: 2, bathrooms: 2, area: 1800, location: { address: 'Main Boulevard, Gulberg 3', city: 'Lahore', state: 'Punjab', country: 'Pakistan' }, features: ['Parking', 'Security', 'Furnished', 'Air Conditioning', 'Electricity'], agent: agent1._id, isApproved: true, isFeatured: true, views: 189 },
    { title: 'Luxury Villa for Rent in Bahria Town Karachi', description: 'An exquisite luxury villa available for rent in the prestigious Bahria Town Karachi. Features a private pool, large garden, smart home technology, and 24/7 security.', price: 250000, type: 'villa', status: 'rent', bedrooms: 5, bathrooms: 5, area: 8000, location: { address: 'Precinct 6, Bahria Town', city: 'Karachi', state: 'Sindh', country: 'Pakistan' }, features: ['Parking', 'Garden', 'Swimming Pool', 'Security', 'Generator', 'Air Conditioning', 'Furnished'], agent: agent2._id, isApproved: true, isFeatured: true, views: 312 },
    { title: 'Commercial Plaza for Sale - Main Tariq Road', description: 'A prime commercial property located on the busy Main Tariq Road in Karachi. Ground + 3 floors, ideal for a shopping mall, offices, or restaurant.', price: 120000000, type: 'commercial', status: 'sale', bedrooms: 0, bathrooms: 4, area: 10000, location: { address: 'Main Tariq Road', city: 'Karachi', state: 'Sindh', country: 'Pakistan' }, features: ['Parking', 'Security', 'Electricity', 'Generator'], agent: agent2._id, isApproved: true, views: 98 },
    { title: '1 Kanal Residential Plot in F-7 Islamabad', description: 'A prime 1 Kanal plot in the most sought-after sector F-7, Islamabad. Ready for construction. All utilities available. Ideal investment opportunity.', price: 65000000, type: 'plot', status: 'sale', bedrooms: 0, bathrooms: 0, area: 4500, location: { address: 'F-7/2, Near Jinnah Super Market', city: 'Islamabad', state: 'ICT', country: 'Pakistan' }, features: ['Water Supply', 'Electricity', 'Gas'], agent: agent1._id, isApproved: true, views: 167 },
    { title: 'Cozy 3-Bedroom Apartment for Rent in E-11', description: 'A well-maintained 3-bedroom apartment for rent in the peaceful E-11 sector of Islamabad. Close to NUST, Islamabad. Bright and airy rooms with modern fixtures.', price: 85000, type: 'apartment', status: 'rent', bedrooms: 3, bathrooms: 2, area: 2200, location: { address: 'E-11/2, Multi Gardens', city: 'Islamabad', state: 'ICT', country: 'Pakistan' }, features: ['Parking', 'Security', 'Gas', 'Electricity', 'Water Supply'], agent: agent2._id, isApproved: true, views: 203 },
  ];

  await Property.insertMany(properties);
  console.log('✅ Properties created');
  console.log('\n🎉 Database seeded successfully!\n');
  console.log('Demo accounts:');
  console.log('  Admin:  admin@realvista.pk / admin123');
  console.log('  Agent:  agent@realvista.pk / agent123');
  console.log('  Buyer:  buyer@realvista.pk / buyer123\n');

=======
  await User.deleteMany({});
  await Property.deleteMany({});

  // Let the model's pre-save hook hash passwords
  const admin = await User.create({
    name: 'Admin User', email: 'admin@realvista.pk', password: 'admin123',
    role: 'admin', phone: '+92 300 0000000', isVerified: true
  });
  const agent1 = await User.create({
    name: 'Ali Hassan', email: 'agent@realvista.pk', password: 'agent123',
    role: 'agent', phone: '+92 321 1234567', isVerified: true,
    bio: 'Experienced real estate agent with 10+ years in Lahore market, specializing in DHA and Gulberg areas.'
  });
  const agent2 = await User.create({
    name: 'Sara Ahmed', email: 'sara@realvista.pk', password: 'agent123',
    role: 'agent', phone: '+92 333 9876543', isVerified: true,
    bio: 'Top-performing agent in Karachi with expertise in luxury properties and commercial real estate.'
  });
  await User.create({
    name: 'Buyer User', email: 'buyer@realvista.pk', password: 'buyer123',
    role: 'buyer', phone: '+92 300 1111111', isVerified: true
  });

  console.log('✅ Users created');

  const properties = [
    { title: 'Stunning 4-Bedroom House in DHA Phase 5 Lahore', description: 'A beautiful, well-maintained 4-bedroom house in the prestigious DHA Phase 5. Modern architecture, spacious rooms, and a lovely garden. Perfect for families.', price: 45000000, type: 'house', status: 'sale', bedrooms: 4, bathrooms: 3, area: 4000, location: { address: 'Street 12, Block B, DHA Phase 5', city: 'Lahore', state: 'Punjab', country: 'Pakistan' }, features: ['Parking', 'Garden', 'Security', 'Generator', 'Gas', 'Electricity'], agent: agent1._id, isApproved: true, isFeatured: true, views: 245 },
    { title: 'Modern Apartment in Gulberg 3 - Ready to Move', description: 'Fully furnished modern apartment in the heart of Gulberg 3. Close to all major amenities, restaurants, and shopping centers.', price: 18000000, type: 'apartment', status: 'sale', bedrooms: 2, bathrooms: 2, area: 1800, location: { address: 'Main Boulevard, Gulberg 3', city: 'Lahore', state: 'Punjab', country: 'Pakistan' }, features: ['Parking', 'Security', 'Furnished', 'Air Conditioning', 'Electricity'], agent: agent1._id, isApproved: true, isFeatured: true, views: 189 },
    { title: 'Luxury Villa for Rent in Bahria Town Karachi', description: 'Exquisite luxury villa with private pool, large garden, smart home technology, and 24/7 security in Bahria Town Karachi.', price: 250000, type: 'villa', status: 'rent', bedrooms: 5, bathrooms: 5, area: 8000, location: { address: 'Precinct 6, Bahria Town', city: 'Karachi', state: 'Sindh', country: 'Pakistan' }, features: ['Parking', 'Garden', 'Swimming Pool', 'Security', 'Generator', 'Air Conditioning', 'Furnished'], agent: agent2._id, isApproved: true, isFeatured: true, views: 312 },
    { title: 'Commercial Plaza for Sale - Main Tariq Road', description: 'Prime commercial property on Main Tariq Road. Ground + 3 floors, ideal for shopping mall, offices, or restaurant.', price: 120000000, type: 'commercial', status: 'sale', bedrooms: 0, bathrooms: 4, area: 10000, location: { address: 'Main Tariq Road', city: 'Karachi', state: 'Sindh', country: 'Pakistan' }, features: ['Parking', 'Security', 'Electricity', 'Generator'], agent: agent2._id, isApproved: true, views: 98 },
    { title: '1 Kanal Residential Plot in F-7 Islamabad', description: 'Prime 1 Kanal plot in F-7 Islamabad. Ready for construction, all utilities available. Excellent investment.', price: 65000000, type: 'plot', status: 'sale', bedrooms: 0, bathrooms: 0, area: 4500, location: { address: 'F-7/2, Near Jinnah Super Market', city: 'Islamabad', state: 'ICT', country: 'Pakistan' }, features: ['Water Supply', 'Electricity', 'Gas'], agent: agent1._id, isApproved: true, views: 167 },
    { title: 'Cozy 3-Bedroom Apartment for Rent in E-11', description: 'Well-maintained 3-bedroom apartment in E-11 Islamabad. Close to NUST. Bright rooms with modern fixtures.', price: 85000, type: 'apartment', status: 'rent', bedrooms: 3, bathrooms: 2, area: 2200, location: { address: 'E-11/2, Multi Gardens', city: 'Islamabad', state: 'ICT', country: 'Pakistan' }, features: ['Parking', 'Security', 'Gas', 'Electricity', 'Water Supply'], agent: agent2._id, isApproved: true, views: 203 },
    { title: '5 Marla House in Bahria Town Rawalpindi', description: 'Brand new 5 Marla house in Bahria Town Phase 8. Modern design with quality finishes. Peaceful neighborhood.', price: 22000000, type: 'house', status: 'sale', bedrooms: 3, bathrooms: 2, area: 2250, location: { address: 'Sector E, Bahria Town Phase 8', city: 'Rawalpindi', state: 'Punjab', country: 'Pakistan' }, features: ['Parking', 'Security', 'Gas', 'Electricity', 'Water Supply'], agent: agent1._id, isApproved: true, views: 134 },
    { title: 'Penthouse Apartment in Clifton Block 5', description: 'Stunning penthouse with panoramic sea views in Clifton. Premium finishes, private terrace, and concierge service.', price: 95000000, type: 'apartment', status: 'sale', bedrooms: 4, bathrooms: 4, area: 5500, location: { address: 'Block 5, Clifton', city: 'Karachi', state: 'Sindh', country: 'Pakistan' }, features: ['Parking', 'Security', 'Furnished', 'Air Conditioning', 'Gym', 'Swimming Pool'], agent: agent2._id, isApproved: false, views: 0 },
  ];

  await Property.insertMany(properties);
  console.log('✅ Properties created (1 pending approval for demo)');
  console.log('\n🎉 Database seeded!\n');
  console.log('Demo accounts:');
  console.log('  Admin: admin@realvista.pk / admin123');
  console.log('  Agent: agent@realvista.pk / agent123');
  console.log('  Buyer: buyer@realvista.pk / buyer123\n');
>>>>>>> 46f2de843b6792b1d9aa613787ea1ee9a55de4b4
  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
