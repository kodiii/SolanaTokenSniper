import { insertMockData } from '../mockData';

async function main() {
  console.log('Inserting mock data...');
  await insertMockData();
  console.log('Done!');
}

main().catch(console.error);
