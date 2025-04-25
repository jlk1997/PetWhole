const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const petController = require('../controllers/petController');

// @route   POST /api/pets
// @desc    Create a new pet
// @access  Private
router.post('/', auth, petController.createPet);

// @route   GET /api/pets
// @desc    Get all pets for current user
// @access  Private
router.get('/', auth, petController.getUserPets);

// @route   GET /api/pets/:id
// @desc    Get pet by ID
// @access  Public
router.get('/:id', petController.getPetById);

// @route   PUT /api/pets/:id
// @desc    Update pet
// @access  Private
router.put('/:id', auth, petController.updatePet);

// @route   DELETE /api/pets/:id
// @desc    Delete pet
// @access  Private
router.delete('/:id', auth, petController.deletePet);

// @route   GET /api/pets/user/:userId
// @desc    Get pets by user ID
// @access  Public
router.get('/user/:userId', petController.getPetsByUserId);

// @route   POST /api/pets/:id/avatar
// @desc    Upload pet avatar
// @access  Private
router.post('/:id/avatar', auth, petController.uploadPetAvatar);

module.exports = router; 