require('dotenv/config'); const {migrate}=require('../lib/db'); migrate(); console.log('Database migrated');
