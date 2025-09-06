/**
 * User and Role Creation
 * 
 * This script creates users and roles for the SensorThings data lake.
 * Customize roles based on your security requirements.
 * 
 * Usage: mongosh --file 02-create-users.js
 */

// Load connection configuration
load('00-connection.js');

// User configuration
const USERS_CONFIG = {
  // Application user with read/write access
  appUser: {
    username: 'sensorthings_app',
    password: 'CHANGE_THIS_PASSWORD', // Change this!
    roles: ['readWrite', 'dbAdmin'],
    description: 'Application service account'
  },
  
  // Read-only user for analytics
  analyticsUser: {
    username: 'sensorthings_analytics',
    password: 'CHANGE_THIS_PASSWORD', // Change this!
    roles: ['read'],
    description: 'Analytics and reporting user'
  },
  
  // Sync service user
  syncUser: {
    username: 'sensorthings_sync',
    password: 'CHANGE_THIS_PASSWORD', // Change this!
    roles: ['readWrite'],
    description: 'External feature and ontology sync service'
  }
};

// Custom roles configuration
const CUSTOM_ROLES = {
  // Observation writer role
  observationWriter: {
    role: 'observationWriter',
    privileges: [
      {
        resource: { db: SENSORTHINGS_CONFIG.DATABASE_NAME, collection: 'observations' },
        actions: ['insert', 'update', 'find']
      },
      {
        resource: { db: SENSORTHINGS_CONFIG.DATABASE_NAME, collection: 'datastreams' },
        actions: ['find']
      }
    ],
    roles: []
  },
  
  // Feature manager role
  featureManager: {
    role: 'featureManager',
    privileges: [
      {
        resource: { db: SENSORTHINGS_CONFIG.DATABASE_NAME, collection: 'features_of_interest' },
        actions: ['find', 'insert', 'update', 'remove']
      },
      {
        resource: { db: SENSORTHINGS_CONFIG.DATABASE_NAME, collection: 'feature_associations' },
        actions: ['find', 'insert', 'update', 'remove']
      },
      {
        resource: { db: SENSORTHINGS_CONFIG.DATABASE_NAME, collection: 'external_feature_cache' },
        actions: ['find', 'insert', 'update', 'remove']
      }
    ],
    roles: []
  },
  
  // Configuration manager role
  configManager: {
    role: 'configManager',
    privileges: [
      {
        resource: { db: SENSORTHINGS_CONFIG.DATABASE_NAME, collection: 'things' },
        actions: ['find', 'insert', 'update', 'remove']
      },
      {
        resource: { db: SENSORTHINGS_CONFIG.DATABASE_NAME, collection: 'sensors' },
        actions: ['find', 'insert', 'update', 'remove']
      },
      {
        resource: { db: SENSORTHINGS_CONFIG.DATABASE_NAME, collection: 'datastreams' },
        actions: ['find', 'insert', 'update', 'remove']
      },
      {
        resource: { db: SENSORTHINGS_CONFIG.DATABASE_NAME, collection: 'observed_properties' },
        actions: ['find', 'insert', 'update', 'remove']
      }
    ],
    roles: []
  }
};

// Create custom roles
function createCustomRoles() {
  const db = getSTDatabase();
  print('\n🔐 Creating custom roles...');
  
  Object.keys(CUSTOM_ROLES).forEach(roleName => {
    const roleConfig = CUSTOM_ROLES[roleName];
    
    try {
      db.getSiblingDB('admin').runCommand({
        createRole: roleConfig.role,
        privileges: roleConfig.privileges,
        roles: roleConfig.roles
      });
      
      print(`✅ Created role: ${roleConfig.role}`);
    } catch (error) {
      if (error.codeName === 'DuplicateKey') {
        print(`⚠️  Role already exists: ${roleConfig.role}`);
      } else {
        print(`❌ Error creating role ${roleConfig.role}: ${error.message}`);
      }
    }
  });
}

// Create users
function createUsers() {
  const db = getSTDatabase();
  print('\n👤 Creating users...');
  
  Object.keys(USERS_CONFIG).forEach(userKey => {
    const userConfig = USERS_CONFIG[userKey];
    
    try {
      db.getSiblingDB('admin').runCommand({
        createUser: userConfig.username,
        pwd: userConfig.password,
        roles: userConfig.roles.map(role => ({
          role: role,
          db: SENSORTHINGS_CONFIG.DATABASE_NAME
        }))
      });
      
      print(`✅ Created user: ${userConfig.username}`);
      print(`   Description: ${userConfig.description}`);
      print(`   Roles: ${userConfig.roles.join(', ')}`);
    } catch (error) {
      if (error.codeName === 'DuplicateKey') {
        print(`⚠️  User already exists: ${userConfig.username}`);
      } else {
        print(`❌ Error creating user ${userConfig.username}: ${error.message}`);
      }
    }
  });
}

// Grant additional privileges
function grantPrivileges() {
  const db = getSTDatabase();
  print('\n🔑 Granting additional privileges...');
  
  // Grant time-series specific privileges
  try {
    db.getSiblingDB('admin').runCommand({
      grantPrivilegesToRole: 'readWrite',
      privileges: [
        {
          resource: { db: SENSORTHINGS_CONFIG.DATABASE_NAME, collection: '' },
          actions: ['createCollection', 'dropCollection', 'createIndex', 'dropIndex']
        }
      ]
    });
    
    print('✅ Granted collection management privileges');
  } catch (error) {
    print(`⚠️  Could not grant additional privileges: ${error.message}`);
  }
}

// List users and roles
function listUsersAndRoles() {
  const db = getSTDatabase();
  print('\n📋 Current users and roles:');
  print('-'.repeat(40));
  
  try {
    // List users
    const users = db.getSiblingDB('admin').runCommand({ usersInfo: 1 });
    if (users.users && users.users.length > 0) {
      print('\nUsers:');
      users.users.forEach(user => {
        print(`  • ${user.user}`);
        user.roles.forEach(role => {
          print(`    - ${role.role} on ${role.db}`);
        });
      });
    }
    
    // List roles
    const roles = db.getSiblingDB('admin').runCommand({ rolesInfo: 1 });
    if (roles.roles && roles.roles.length > 0) {
      print('\nCustom Roles:');
      roles.roles.forEach(role => {
        if (!['read', 'readWrite', 'dbAdmin', 'dbOwner', 'userAdmin'].includes(role.role)) {
          print(`  • ${role.role}`);
        }
      });
    }
  } catch (error) {
    print(`⚠️  Could not list users and roles: ${error.message}`);
    print('   You may need admin privileges to view this information.');
  }
}

// Connection string generator
function generateConnectionStrings() {
  print('\n🔗 Connection strings for each user:');
  print('-'.repeat(40));
  
  const baseUrl = SENSORTHINGS_CONFIG.CONNECTION_STRING
    .replace('mongodb+srv://', '')
    .replace(/<username>:<password>@/, '');
  
  Object.keys(USERS_CONFIG).forEach(userKey => {
    const user = USERS_CONFIG[userKey];
    print(`\n${user.description}:`);
    print(`mongodb+srv://${user.username}:<password>@${baseUrl}${SENSORTHINGS_CONFIG.DATABASE_NAME}?retryWrites=true&w=majority`);
  });
  
  print('\n⚠️  Remember to replace <password> with the actual password!');
}

// Main execution
if (typeof db !== 'undefined') {
  print('\n🚀 Starting user and role setup...\n');
  
  try {
    // Note: Creating users and roles requires appropriate privileges
    // This might fail on MongoDB Atlas free tier or without admin access
    
    print('⚠️  IMPORTANT: User creation requires admin privileges.');
    print('   On MongoDB Atlas, use the Atlas UI to create users.');
    print('   The users and roles below are recommendations.\n');
    
    // Try to create roles and users
    // These operations might fail without proper privileges
    // createCustomRoles();
    // createUsers();
    // grantPrivileges();
    
    // Show recommendations instead
    print('📋 Recommended Users:');
    print('-'.repeat(40));
    Object.keys(USERS_CONFIG).forEach(userKey => {
      const user = USERS_CONFIG[userKey];
      print(`\n${user.username}:`);
      print(`  Description: ${user.description}`);
      print(`  Roles: ${user.roles.join(', ')}`);
    });
    
    print('\n📋 Recommended Custom Roles:');
    print('-'.repeat(40));
    Object.keys(CUSTOM_ROLES).forEach(roleName => {
      const role = CUSTOM_ROLES[roleName];
      print(`\n${role.role}:`);
      role.privileges.forEach(priv => {
        print(`  • ${priv.resource.collection || 'all collections'}: ${priv.actions.join(', ')}`);
      });
    });
    
    generateConnectionStrings();
    
    print('\n✅ User and role recommendations generated!');
    print('\n📌 Next steps:');
    print('   1. Create users in MongoDB Atlas UI or with admin access');
    print('   2. Update connection strings in your application');
    print('   3. Run collection creation scripts');
    
  } catch (error) {
    print(`\n❌ Error during setup: ${error.message}`);
    print('   This is expected if you don\'t have admin privileges.');
    print('   Please create users manually in MongoDB Atlas.');
  }
} else {
  print('Please run this script with mongosh');
}
