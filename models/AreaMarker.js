const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema({
    areaId: {
        type: String,
        required: true,
        unique: true
    },
    coordinates: {
        type: {
            type: String,
            enum: ['Polygon'],
            required: true
        },
        coordinates: {
            type: [[[Number]]], // [longitude, latitude]
            required: true
        }
    },
    centerPoint: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        }
    }
});

const markerSchema = new mongoose.Schema({
    areaId: {
        type: String,
        required: true,
        ref: 'Area'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    markerType: {
        type: String,
        enum: ['stray_dog', 'lost_dog'],
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    images: [{
        url: String,
        thumbnail: String
    }],
    contactInfo: {
        name: String,
        phone: String,
        wechat: String
    },
    status: {
        type: String,
        enum: ['active', 'resolved', 'expired'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true
    },
    locationDetail: {
        address: String,
        latitude: Number,
        longitude: Number
    },
    reportCount: {
        type: Number,
        default: 0
    }
});

const reportSchema = new mongoose.Schema({
    markerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Marker'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    reason: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['pending', 'processed'],
        default: 'pending'
    }
});

// 创建索引
areaSchema.index({ coordinates: '2dsphere' });
markerSchema.index({ areaId: 1, status: 1 });
markerSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL索引

// 添加方法
markerSchema.methods.isExpired = function() {
    return this.expiresAt < new Date();
};

markerSchema.methods.canBeEditedBy = function(userId) {
    return this.userId.toString() === userId.toString();
};

// 添加静态方法
markerSchema.statics.findActiveInArea = function(areaId) {
    return this.find({
        areaId: areaId,
        status: 'active',
        expiresAt: { $gt: new Date() }
    }).populate('userId', 'nickname avatar');
};

const Area = mongoose.model('Area', areaSchema);
const Marker = mongoose.model('Marker', markerSchema);
const Report = mongoose.model('Report', reportSchema);

module.exports = {
    Area,
    Marker,
    Report
}; 