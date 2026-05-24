
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const collectionName = 'pandals';

try {
  // When running locally, initializeApp() will automatically use
  // Application Default Credentials (ADC) if they are configured.
  // This is a more secure and convenient method than managing a service account key file.
  // To set this up, run `gcloud auth application-default login` in your terminal.
  if (!admin.apps.length) {
    admin.initializeApp();
  }
} catch (error) {
  console.error('Error initializing Firebase Admin SDK.', error);
  console.log(
    'Please ensure you have authenticated with Google Cloud by running "gcloud auth application-default login" in your terminal.'
  );
  process.exit(1);
}

const db = admin.firestore();
const pandalData = JSON.parse(readFileSync(resolve(__dirname, 'pandal-data.json'), 'utf8'));

async function seedDatabase() {
  console.log(`Starting to seed the '${collectionName}' collection...`);
  
  if (!Array.isArray(pandalData) || pandalData.length === 0) {
    console.error('Error: Pandal data is empty or not in the correct format.');
    return;
  }
  
  const collectionRef = db.collection(collectionName);
  
  // Firestore limits batch writes to 500 documents.
  // We'll process the data in chunks to stay within this limit.
  const chunkSize = 500;
  for (let i = 0; i < pandalData.length; i += chunkSize) {
    const chunk = pandalData.slice(i, i + chunkSize);
    const batch = db.batch();

    chunk.forEach((pandal: any, index: number) => {
      // Use a consistent ID based on array index to avoid duplicates.
      const docId = `pandal_${String(i + index).padStart(4, '0')}`;
      const docRef = collectionRef.doc(docId);
      batch.set(docRef, { ...pandal, id: docId });
    });

    try {
      await batch.commit();
      console.log(`Successfully seeded chunk ${Math.floor(i / chunkSize) + 1}.`);
    } catch (error) {
      console.error('Error seeding database chunk:', error);
      // Stop on first error to avoid partial data.
      return;
    }
  }
  
  console.log(`Successfully seeded ${pandalData.length} documents into the '${collectionName}' collection.`);
}

seedDatabase();
