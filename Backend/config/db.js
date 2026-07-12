import mongoose from 'mongoose';

const normalizeMongoUri = () => {
  const configuredUri = process.env.MONGO_URI;
  if (!configuredUri) {
    throw new Error('MONGO_URI is required in environment');
  }

  if (!configuredUri.startsWith('mongodb')) {
    return configuredUri;
  }

  const withoutQuery = configuredUri.split('?')[0];
  const hasDatabaseName = /\/[^/]+$/.test(withoutQuery);

  if (!hasDatabaseName) {
    return configuredUri.endsWith('/') ? `${configuredUri}guardianai` : `${configuredUri}/guardianai`;
  }

  return configuredUri;
};

const connectDB = async () => {
  try {
    const mongoUri = normalizeMongoUri();
    const connection = await mongoose.connect(mongoUri);
    console.log(`MongoDB connected: ${connection.connection.host} / ${connection.connection.name}`);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

export default connectDB;
