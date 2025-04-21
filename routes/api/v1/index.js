import express from 'express';
import {
  baseApiRoute,
  createCropType,
  createHarvester,
  createLandSizeUnit,
  createTransportArrangement,
  createVideoTutorial,
  deleteAccount,
  deleteCropType,
  deleteHarvester,
  deleteLandSizeUnit,
  deleteTransportArrangement,
  deleteVideoTutorial,
  generateOtp,
  getAllVideoTutorial,
  getCropTypes,
  getCropTypesByLanguage,
  getHarvestersByLanguage,
  getHomeData,
  getLandSizeUnitByLanguage,
  getTransportArrangementsByLanguage,
  getVideoTutorialByLanguageCode,
  logout,
  restoreCropType,
  restoreHarvester,
  restoreLandSizeUnit,
  restoreTransportArrangement,
  restoreVideoTutorial,
  selectUserLanguage,
  updateCropType,
  updateHarvester,
  updateLandSizeUnit,
  updateTransportArrangement,
  updateVideoTutorial,
  verifyOtp,
} from '../../../controllers/api/v1/index.js';
import { authenticateToken, authorizeAdmin } from '../../../middleware/index.js';

const API_ROUTER = express.Router();

// Base Route
API_ROUTER.get('/', baseApiRoute);

// OTP Route
API_ROUTER.post('/generateOtp', generateOtp);
API_ROUTER.post('/verifyOtp', verifyOtp);

// Video Tutorial Route
API_ROUTER.post('/createVideoTutorial', authenticateToken, authorizeAdmin, createVideoTutorial);
API_ROUTER.put('/updateVideoTutorial', authenticateToken, authorizeAdmin, updateVideoTutorial);
API_ROUTER.delete('/deleteVideoTutorial', authenticateToken, authorizeAdmin, deleteVideoTutorial);
API_ROUTER.patch('/restoreVideoTutorial', authenticateToken, authorizeAdmin, restoreVideoTutorial);
API_ROUTER.post('/getVideoTutorialByLanguageCode', getVideoTutorialByLanguageCode);
API_ROUTER.get('/getAllVideoTutorial', getAllVideoTutorial);

// Crop Type Route
API_ROUTER.post('/createCropType', createCropType);
API_ROUTER.put('/updateCropType', updateCropType);
API_ROUTER.delete('/deleteCropType', deleteCropType);
API_ROUTER.patch('/restoreCropType', restoreCropType);
API_ROUTER.get('/getCropTypes', getCropTypes);
API_ROUTER.post('/getCropTypesByLanguage', getCropTypesByLanguage);

// Harvesters Route
API_ROUTER.post('/createHarvester', createHarvester);
API_ROUTER.put('/updateHarvester', updateHarvester);
API_ROUTER.delete('/deleteHarvester', deleteHarvester);
API_ROUTER.patch('/restoreHarvester', restoreHarvester);
API_ROUTER.get('/getHarvestersByLanguage', getHarvestersByLanguage);

// Transport Arrangements Route
API_ROUTER.post('/createTransportArrangement', createTransportArrangement);
API_ROUTER.put('/updateTransportArrangement', updateTransportArrangement);
API_ROUTER.delete('/deleteTransportArrangement', deleteTransportArrangement);
API_ROUTER.patch('/restoreTransportArrangement', restoreTransportArrangement);
API_ROUTER.get('/getTransportArrangementsByLanguage', getTransportArrangementsByLanguage);

//  Land Size Unit Route
API_ROUTER.post('/createLandSizeUnit', authenticateToken, authorizeAdmin, createLandSizeUnit);
API_ROUTER.put('/updateLandSizeUnit', authenticateToken, authorizeAdmin, updateLandSizeUnit);
API_ROUTER.delete('/deleteLandSizeUnit', authenticateToken, authorizeAdmin, deleteLandSizeUnit);
API_ROUTER.patch('/restoreLandSizeUnit', authenticateToken, authorizeAdmin, restoreLandSizeUnit);
API_ROUTER.post('/getLandSizeUnitByLanguage', getLandSizeUnitByLanguage);

// Home Data Route
API_ROUTER.get('/getHomeData', authenticateToken, getHomeData);

// User Select Language Route
API_ROUTER.post('/selectUserLanguage', authenticateToken, selectUserLanguage);

// Logout Route
API_ROUTER.get('/logout', authenticateToken, logout);

// Delete Account Route
API_ROUTER.post('/deleteAccount', authenticateToken, deleteAccount);

export default API_ROUTER;
