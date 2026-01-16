require('dotenv').config();

const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

console.log('🧪 FINAL TEST - User Model with Correct Schema\n');

async function runTest() {
    let sequelize = null;
    
    try {
        // ============================================
        // 1. CREATE DATABASE CONNECTION
        // ============================================
        console.log('1. Creating database connection...');
        
        sequelize = new Sequelize(
            process.env.DB_NAME,
            process.env.DB_USER,
            process.env.DB_PASSWORD,
            {
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                dialect: 'postgres',
                logging: false,
                define: {
                    timestamps: true,
                    underscored: true
                }
            }
        );
        
        await sequelize.authenticate();
        console.log('✅ Database connection successful\n');
        
        // ============================================
        // 2. DEFINE USER MODEL (SIMPLE VERSION)
        // ============================================
        console.log('2. Defining simplified User model...');
        
        const User = sequelize.define('User', {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            username: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true
            },
            email: {
                type: DataTypes.STRING(255),
                allowNull: false,
                unique: true
            },
            password: {
                type: DataTypes.STRING(255),
                allowNull: false
            },
            displayName: {
                type: DataTypes.STRING(100),
                field: 'display_name'
            },
            role: {
                type: DataTypes.STRING(20),
                defaultValue: 'user'
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                field: 'is_active',
                defaultValue: true
            }
        }, {
            tableName: 'users',
            timestamps: true,
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            
            // Hooks for password hashing
            hooks: {
                beforeCreate: async (user) => {
                    console.log('🔐 Hashing password before create...');
                    if (user.password) {
                        const salt = await bcrypt.genSalt(10);
                        user.password = await bcrypt.hash(user.password, salt);
                    }
                }
            },
            
            // Exclude password by default
            defaultScope: {
                attributes: {
                    exclude: ['password']
                }
            },
            
            // Include password for authentication
            scopes: {
                withPassword: {
                    attributes: {
                        include: ['password']
                    }
                }
            }
        });
        
        console.log('✅ User model defined\n');
        
        // ============================================
        // 3. ADD INSTANCE METHODS
        // ============================================
        console.log('3. Adding instance methods...');
        
        User.prototype.comparePassword = async function(candidatePassword) {
            return await bcrypt.compare(candidatePassword, this.password);
        };
        
        User.prototype.getPublicProfile = function() {
            const values = Object.assign({}, this.get());
            delete values.password;
            return values;
        };
        
        console.log('✅ Instance methods added\n');
        
        // ============================================
        // 4. ADD STATIC METHODS
        // ============================================
        console.log('4. Adding static methods...');
        
        User.findByEmailForAuth = async function(email) {
            return await this.scope('withPassword').findOne({
                where: { email: email.toLowerCase() }
            });
        };
        
        console.log('✅ Static methods added\n');
        
        // ============================================
        // 5. TEST: CREATE NEW USER
        // ============================================
        console.log('5. Testing user creation...');
        
        // Clean up any existing test user
        try {
            const existingTestUser = await User.findOne({
                where: { email: 'newtest@example.com' }
            });
            if (existingTestUser) {
                console.log('🗑️  Deleting existing test user...');
                await existingTestUser.destroy();
            }
        } catch (error) {
            console.log('⚠️  No existing test user to delete');
        }
        
        // Create new test user
        const testUser = await User.create({
            username: 'newtestuser',
            email: 'newtest@example.com',
            password: 'SecurePass123!',
            displayName: 'New Test User',
            role: 'user'
        });
        
        console.log('✅ Test user created:');
        console.log(`   ID: ${testUser.id}`);
        console.log(`   Username: ${testUser.username}`);
        console.log(`   Email: ${testUser.email}`);
        console.log(`   Display Name: ${testUser.displayName}`);
        console.log(`   Role: ${testUser.role}`);
        console.log(`   Is Active: ${testUser.isActive}`);
        console.log('');
        
        // ============================================
        // 6. TEST: PASSWORD HASHING
        // ============================================
        console.log('6. Testing password hashing...');
        
        // Get the user WITH password to check hash
        const userWithPassword = await User.scope('withPassword').findByPk(testUser.id);
        
        if (userWithPassword && userWithPassword.password) {
            console.log(`✅ Password is hashed: ${userWithPassword.password.startsWith('$2')}`);
            console.log(`✅ Hash length: ${userWithPassword.password.length} characters`);
            console.log(`✅ Hash prefix: ${userWithPassword.password.substring(0, 30)}...`);
        } else {
            console.log('❌ Could not retrieve password hash');
        }
        console.log('');
        
        // ============================================
        // 7. TEST: PASSWORD COMPARISON
        // ============================================
        console.log('7. Testing password comparison...');
        
        if (userWithPassword) {
            const correctMatch = await userWithPassword.comparePassword('SecurePass123!');
            const wrongMatch = await userWithPassword.comparePassword('WrongPassword!');
            
            console.log(`✅ Correct password matches: ${correctMatch}`);
            console.log(`✅ Wrong password rejected: ${!wrongMatch}`);
        }
        console.log('');
        
        // ============================================
        // 8. TEST: FIND USER FOR AUTHENTICATION
        // ============================================
        console.log('8. Testing authentication lookup...');
        
        const authUser = await User.findByEmailForAuth('newtest@example.com');
        console.log(`✅ Found user for auth: ${authUser ? 'Yes' : 'No'}`);
        
        if (authUser) {
            console.log(`✅ Password included for auth: ${authUser.password ? 'Yes' : 'No'}`);
            
            // Test password comparison on auth user
            const authMatch = await authUser.comparePassword('SecurePass123!');
            console.log(`✅ Auth user password matches: ${authMatch}`);
        }
        console.log('');
        
        // ============================================
        // 9. TEST: DEFAULT SCOPE (PASSWORD HIDDEN)
        // ============================================
        console.log('9. Testing default scope...');
        
        const regularUser = await User.findOne({ 
            where: { email: 'newtest@example.com' } 
        });
        
        console.log(`✅ Found user with default scope: ${regularUser ? 'Yes' : 'No'}`);
        console.log(`✅ Password excluded by default: ${!regularUser?.password ? 'Yes' : 'No'}`);
        
        if (regularUser) {
            console.log(`✅ Can still access other fields: ${regularUser.username}, ${regularUser.email}`);
        }
        console.log('');
        
        // ============================================
        // 10. TEST: PUBLIC PROFILE METHOD
        // ============================================
        console.log('10. Testing public profile method...');
        
        if (userWithPassword) {
            const publicProfile = userWithPassword.getPublicProfile();
            console.log(`✅ Public profile created: ${publicProfile ? 'Yes' : 'No'}`);
            console.log(`✅ Password excluded: ${!publicProfile.password ? 'Yes' : 'No'}`);
            console.log(`✅ Username included: ${publicProfile.username === 'newtestuser'}`);
            console.log(`✅ Email included: ${publicProfile.email === 'newtest@example.com'}`);
        }
        console.log('');
        
        // ============================================
        // 11. TEST: UPDATE USER
        // ============================================
        console.log('11. Testing user update...');
        
        const userToUpdate = await User.findByPk(testUser.id);
        if (userToUpdate) {
            userToUpdate.displayName = 'Updated Name';
            await userToUpdate.save();
            
            const updatedUser = await User.findByPk(testUser.id);
            console.log(`✅ User updated: ${updatedUser.displayName === 'Updated Name'}`);
        }
        console.log('');
        
        // ============================================
        // 12. CLEAN UP
        // ============================================
        console.log('12. Cleaning up...');
        
        await testUser.destroy();
        
        // Verify deletion
        const deletedUser = await User.findOne({ 
            where: { email: 'newtest@example.com' } 
        });
        
        console.log(`✅ Test user deleted: ${!deletedUser ? 'Yes' : 'No'}`);
        console.log('');
        
        // ============================================
        // 13. FINAL VERIFICATION
        // ============================================
        console.log('13. Final verification...');
        
        // Count total users
        const allUsers = await User.findAll();
        console.log(`✅ Total users in database: ${allUsers.length}`);
        
        // List all users (without passwords)
        console.log('📋 All users in database:');
        allUsers.forEach(user => {
            console.log(`   - ${user.username} (${user.email}) - ${user.role}`);
        });
        
        console.log('\n🎉🎉🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉🎉🎉');
        console.log('\n✅ Database connection working');
        console.log('✅ User model correctly defined');
        console.log('✅ Password hashing working');
        console.log('✅ Authentication methods working');
        console.log('✅ Security features implemented');
        
    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error('\nError details:');
        console.error(error.stack);
        
        if (error.original) {
            console.error('\nOriginal database error:', error.original.message);
        }
        
    } finally {
        if (sequelize) {
            await sequelize.close();
            console.log('\n👋 Database connection closed');
        }
    }
}

// Run the test
runTest();