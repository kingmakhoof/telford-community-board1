const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        username: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            validate: {
                len: [3, 50]
            }
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            },
            set(value) {
                this.setDataValue('email', value.toLowerCase().trim());
            }
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                len: [8, 100]
            }
        },
        displayName: {
            type: DataTypes.STRING(100),
            field: 'display_name'
        },
        role: {
            type: DataTypes.STRING(20),
            defaultValue: 'user',
            validate: {
                isIn: [['user', 'moderator', 'admin']]
            }
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            field: 'is_active',
            defaultValue: true
        },
        emailVerified: {
            type: DataTypes.BOOLEAN,
            field: 'email_verified',
            defaultValue: false
        },
        lastLogin: {
            type: DataTypes.DATE,
            field: 'last_login'
        }
    }, {
        tableName: 'users',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        
        hooks: {
            beforeCreate: async (user) => {
                await hashPassword(user);
                if (!user.displayName) {
                    user.displayName = user.username;
                }
            },
            beforeUpdate: async (user) => {
                if (user.changed('password')) {
                    await hashPassword(user);
                }
            }
        },
        
        defaultScope: {
            attributes: {
                exclude: ['password']
            }
        },
        
        scopes: {
            withPassword: {
                attributes: {
                    include: ['password']
                }
            }
        }
    });
    
    async function hashPassword(user) {
        if (user.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
        }
    }
    
    User.prototype.comparePassword = async function(candidatePassword) {
        return await bcrypt.compare(candidatePassword, this.password);
    };
    
    User.prototype.getPublicProfile = function() {
        const values = Object.assign({}, this.get());
        delete values.password;
        return values;
    };
    
    User.findByEmailForAuth = async function(email) {
        return await this.scope('withPassword').findOne({
            where: {
                email: email.toLowerCase().trim(),
                isActive: true
            }
        });
    };
    
    User.findByUsernameForAuth = async function(username) {
        return await this.scope('withPassword').findOne({
            where: {
                username: username,
                isActive: true
            }
        });
    };
    
    return User;
};