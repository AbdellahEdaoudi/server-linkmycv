const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { verifyJWT } = require('../middlewares/verifyJWT');

// ── Public Route (no auth required) ──
router.get('/:username', userController.getUserByUsername);

// ── Protected Routes (JWT required) ──
const protectedRouter = express.Router();
protectedRouter.use(verifyJWT);

// Profile & Avatar
protectedRouter.put('/profile', userController.updateBasicProfile);
protectedRouter.put('/avatar',  userController.uploadAvatarMiddleware, userController.updateAvatar);

// Experience CRUD
protectedRouter.post('/experiences',      userController.addExperience);
protectedRouter.put('/experiences/:id',   userController.updateExperience);
protectedRouter.delete('/experiences/:id',userController.deleteExperience);

// Education CRUD
protectedRouter.post('/educations',      userController.addEducation);
protectedRouter.put('/educations/:id',   userController.updateEducation);
protectedRouter.delete('/educations/:id',userController.deleteEducation);

// Skills CRUD
protectedRouter.post('/skills',      userController.addSkill);
protectedRouter.delete('/skills/:id',userController.deleteSkill);

// Languages CRUD
protectedRouter.post('/languages',      userController.addLanguage);
protectedRouter.delete('/languages/:id',userController.deleteLanguage);

router.use('/', protectedRouter);

module.exports = router;
