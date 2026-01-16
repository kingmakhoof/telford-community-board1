const { sequelize } = require('../config/database');
const { Sequelize } = require('sequelize');

const db = {};

// Load models manually
db.User = require('./User')(sequelize, Sequelize.DataTypes);

// Store sequelize instances
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;