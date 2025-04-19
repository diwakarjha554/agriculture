import jwt from 'jsonwebtoken';
import { db } from '../../../utils/db.js';
import { JWT_SECRET_KEY } from '../../../utils/dotenv.js';
import { formatDateTime } from '../../../utils/helpers.js';

/**
 * Get base api route
 * @param {Object} res - Response object
 */
export const baseApiRoute = async (req, res) => {
  try {
    return res.status(200).json({
      error: false,
      code: 200,
      status: 1,
      message: '50hertz backend api working properly',
      payload: {},
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      code: 500,
      status: 0,
      message: error.message,
      payload: {},
    });
  }
};

/**
 * Generate OTP for a given phone number
 * @param {Object} req - phone
 * @param {Object} res - id, phone, otp, expireAt
 */
export const generateOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        error: true,
        code: 400,
        status: 0,
        message: 'Phone number is required',
        payload: {},
      });
    }

    // Delete any existing OTPs for the phone number
    await db.query(
      `
      DELETE FROM otps 
      WHERE phone = ?
    `,
      [phone]
    );

    // Generate new OTP and set expiry time (15 minutes from now)
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Insert new OTP into the database
    const [insertResult] = await db.query(
      `
      INSERT INTO otps (phone, otp_code, expires_at)
      VALUES (?, ?, ?)
    `,
      [phone, otp, expiresAt]
    );

    const result = {
      id: insertResult.insertId,
      phone,
      otp,
      expiresAt: formatDateTime(expiresAt),
    };

    // TODO: integrate SMS provider here for sending the OTP message

    return res.status(200).json({
      error: false,
      code: 200,
      status: 1,
      message: 'OTP sent successfully',
      payload: result,
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      code: 500,
      status: 0,
      message: error.message,
      payload: {},
    });
  }
};

/**
 * Verify OTP for phone login.
 * @param {Object} req - phone, otp, deviceType, fcmToken, languageCode and languageName.
 * @param {Object} res - Response object.
 */
export const verifyOtp = async (req, res) => {
  try {
    const { phone, otp, deviceType, fcmToken, languageCode, languageName } = req.body;

    if (!phone || !otp || !languageCode || !languageName) {
      return res.status(400).json({
        error: true,
        code: 400,
        status: 0,
        message: 'Phone number, OTP, language code and language name are required',
        payload: {},
      });
    }

    const fcm = fcmToken || '';

    const [otpRows] = await db.query(
      `
      SELECT * FROM otps
      WHERE phone = ? AND otp_code = ? AND expires_at > NOW()
      ORDER BY id DESC
      LIMIT 1
      `,
      [phone, otp]
    );

    // If no valid OTP is found, send an error response.
    if (!otpRows || otpRows.length === 0) {
      return res.status(400).json({
        error: true,
        code: 400,
        status: 0,
        message: 'Invalid or expired OTP',
        payload: {},
      });
    }

    // OTP is valid, so delete it to prevent reuse.
    await db.query(`DELETE FROM otps WHERE id = ?`, [otpRows[0].id]);

    // Check if user exists; if not, create a new user.
    let userId;
    const [userRows] = await db.query(`SELECT * FROM users WHERE phone = ?`, [phone]);
    if (userRows.length === 0) {
      // Note: Use three placeholders for phone, device_type, and fcm_token.
      const [insertResult] = await db.query(
        `INSERT INTO users (phone, device_type, language_code, language_name, fcm_token) VALUES (?, ?, ?, ?, ?)`,
        [phone, deviceType, languageCode, languageName, fcm]
      );
      userId = insertResult.insertId;
    } else {
      userId = userRows[0].id;
    }

    // Generate JWT token with expiry of 30 days using process.env.JWT_SECRET.
    const token = jwt.sign({ userId, phone }, JWT_SECRET_KEY, {
      expiresIn: '30d',
    });

    // Calculate token expiry timestamp (30 days from now)
    const expiresAt = formatDateTime(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

    // Delete old tokens for this user (to ensure only one active token per user)
    await db.query(`DELETE FROM user_tokens WHERE user_id = ?`, [userId]);

    // Insert the new token into the user_tokens table.
    await db.query(
      `INSERT INTO user_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
      [userId, token, expiresAt] // Pass the formatted expiration date here
    );

    // Retrieve updated user info for response.
    const [updatedUserRows] = await db.query(`SELECT * FROM users WHERE id = ?`, [userId]);
    const userProfile = updatedUserRows[0];

    userProfile.created_at = formatDateTime(new Date(userProfile.created_at));
    userProfile.updated_at = formatDateTime(new Date(userProfile.updated_at));

    return res.status(200).json({
      error: false,
      code: 200,
      status: 1,
      message: 'OTP verified successfully',
      payload: {
        token,
        userProfile,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      code: 500,
      status: 0,
      message: error.message,
      payload: {},
    });
  }
};

/**
 * Create a new video tutorial
 * @param {Object} req - video_url, language_code
 * @param {Object} res - payload : id, video_url, language_code
 */
export const createVideoTutorial = async (req, res) => {
  try {
    const { videoUrl, languageCode } = req.body;
    if (!videoUrl || !languageCode) {
      return res.status(400).json({
        error: true,
        code: 400,
        status: 0,
        message: 'video_url and language_code are required',
        payload: {},
      });
    }
    const [insertResult] = await db.query(`INSERT INTO video_tutorials (video_url, language_code) VALUES (?, ?)`, [
      videoUrl,
      languageCode,
    ]);
    const newTutorial = {
      id: insertResult.insertId,
      videoUrl,
      languageCode,
    };
    return res.status(201).json({
      error: false,
      code: 201,
      status: 1,
      message: 'Video tutorial created successfully',
      payload: newTutorial,
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      code: 500,
      status: 0,
      message: error.message,
      payload: {},
    });
  }
};

/**
 * Create a new video tutorial
 * @param {Object} req - video_url, language_code
 * @param {Object} res - payload : id, video_url, language_code
 */
export const updateVideoTutorial = async (req, res) => {
  try {
    const { id, video_url, language_code } = req.body;
    if (!id) {
      return res.status(400).json({
        error: true,
        code: 400,
        status: 0,
        message: 'id is required',
        payload: {},
      });
    }
    if (!video_url && !language_code) {
      return res.status(400).json({
        error: true,
        Code: 400,
        Status: 0,
        Message: 'At least one of video_url or language_code must be provided',
        Payload: {},
      });
    }
    // Check if video tutorial exists
    const [rows] = await db.query(`SELECT * FROM video_tutorials WHERE id = ?`, [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        Error: true,
        Code: 404,
        Status: 0,
        Message: 'Video tutorial not found',
        Payload: {},
      });
    }
    const tutorial = rows[0];
    // Determine updated values
    const updatedUrl = video_url || tutorial.video_url;
    const updatedLangCode = language_code || tutorial.language_code;
    // Perform update
    await db.query(`UPDATE video_tutorials SET video_url = ?, language_code = ? WHERE id = ?`, [
      updatedUrl,
      updatedLangCode,
      id,
    ]);
    return res.status(200).json({
      Error: false,
      Code: 200,
      Status: 1,
      Message: 'Video tutorial updated successfully',
      Payload: { id, video_url: updatedUrl, language_code: updatedLangCode },
    });
  } catch (error) {
    return res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: error.message,
      Payload: {},
    });
  }
};

/**
 * Create a new video tutorial
 * @param {Object} req - video_url, language_code
 * @param {Object} res - payload : id, video_url, language_code
 */
export const deleteVideoTutorial = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'id is required',
        Payload: {},
      });
    }
    // Check if tutorial exists
    const [rows] = await db.query(`SELECT * FROM video_tutorials WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        Error: true,
        Code: 404,
        Status: 0,
        Message: 'Video tutorial not found',
        Payload: {},
      });
    }
    if (rows[0].status === '0') {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'Video tutorial is already deleted',
        Payload: {},
      });
    }
    // Soft delete
    await db.query(`UPDATE video_tutorials SET status = '0' WHERE id = ?`, [id]);
    return res.status(200).json({
      Error: false,
      Code: 200,
      Status: 1,
      Message: 'Video tutorial deleted successfully',
      Payload: {},
    });
  } catch (error) {
    return res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: error.message,
      Payload: {},
    });
  }
};

/**
 * Create a new video tutorial
 * @param {Object} req - video_url, language_code
 * @param {Object} res - payload : id, video_url, language_code
 */
export const restoreVideoTutorial = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'id is required',
        Payload: {},
      });
    }
    // Check if tutorial exists and is deleted
    const [rows] = await db.query(`SELECT * FROM video_tutorials WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        Error: true,
        Code: 404,
        Status: 0,
        Message: 'Video tutorial not found',
        Payload: {},
      });
    }
    if (rows[0].status === '1') {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'Video tutorial is already active',
        Payload: {},
      });
    }
    // Restore
    await db.query(`UPDATE video_tutorials SET status = '1' WHERE id = ?`, [id]);
    return res.status(200).json({
      Error: false,
      Code: 200,
      Status: 1,
      Message: 'Video tutorial restored successfully',
      Payload: { id },
    });
  } catch (error) {
    return res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: error.message,
      Payload: {},
    });
  }
};

/**
 * Create a new video tutorial
 * @param {Object} req - language_code
 * @param {Object} res - payload : id, video_url, language_code
 */
export const getVideoTutorialByLanguageCode = async (req, res) => {
  try {
    const { languageCode } = req.body;
    const [rows] = await db.query(`SELECT * FROM video_tutorials WHERE language_code = ? AND status = '1'`, [
      languageCode,
    ]);
    if (rows.length === 0) {
      return res.status(404).json({
        error: true,
        code: 404,
        status: 0,
        message: 'No video tutorials found for the specified language code',
        payload: {},
      });
    }
    rows[0].created_at = formatDateTime(new Date(rows[0].created_at));
    rows[0].updated_at = formatDateTime(new Date(rows[0].updated_at));
    return res.status(200).json({
      error: false,
      code: 200,
      status: 1,
      message: 'Video tutorials fetched successfully',
      payload: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      code: 500,
      status: 0,
      message: error.message,
      payload: {},
    });
  }
};

/**
 * Create a new video tutorial
 * @param {Object} req - video_url, language_code
 * @param {Object} res - payload : id, video_url, language_code
 */
export const getAllVideoTutorial = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM video_tutorials`);

    return res.status(200).json({
      Error: false,
      Code: 200,
      Status: 1,
      Message: 'All video tutorials fetched successfully',
      Payload: rows,
    });
  } catch (error) {
    return res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: error.message,
      Payload: {},
    });
  }
};

/**
 * Create crop type
 */
export const createCropType = async (req, res) => {
  try {
    const { name_en, name_pa, name_bgc_in, name_hi, name_raj_in } = req.body;
    if (!name_en || !name_pa || !name_bgc_in || !name_hi || !name_raj_in) {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'All crop names are required',
        Payload: {},
      });
    }
    const [result] = await db.query(
      `INSERT INTO crop_types (name_en, name_pa, name_bgc_in, name_hi, name_raj_in, status) VALUES (?, ?, ?, ?, ?, '1')`,
      [name_en, name_pa, name_bgc_in, name_hi, name_raj_in]
    );
    return res.status(201).json({
      Error: false,
      Code: 201,
      Status: 1,
      Message: 'Crop type created successfully',
      Payload: { id: result.insertId },
    });
  } catch (error) {
    return res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: error.message,
      Payload: {},
    });
  }
};

/**
 * Update crop type
 */
export const updateCropType = async (req, res) => {
  try {
    const { id, name_en, name_pa, name_bgc_in, name_hi, name_raj_in } = req.body;
    if (!id || !name_en || !name_pa || !name_bgc_in || !name_hi || !name_raj_in) {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'id and all crop names are required',
        Payload: {},
      });
    }
    const [exists] = await db.query(`SELECT * FROM crop_types WHERE id = ?`, [id]);
    if (exists.length === 0) {
      return res.status(404).json({
        Error: true,
        Code: 404,
        Status: 0,
        Message: 'Crop type not found',
        Payload: {},
      });
    }
    await db.query(
      `UPDATE crop_types SET name_en = ?, name_pa = ?, name_bgc_in = ?, name_hi = ?, name_raj_in = ? WHERE id = ?`,
      [name_en, name_pa, name_bgc_in, name_hi, name_raj_in, id]
    );
    return res.status(200).json({
      Error: false,
      Code: 200,
      Status: 1,
      Message: 'Crop type updated successfully',
      Payload: { id },
    });
  } catch (error) {
    return res.status(500).json({ Error: true, Code: 500, Status: 0, Message: error.message, Payload: {} });
  }
};

/**
 * Delete crop type (soft delete)
 */
export const deleteCropType = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ Error: true, Code: 400, Status: 0, Message: 'id is required', Payload: {} });
    }
    await db.query(`UPDATE crop_types SET status = '0' WHERE id = ?`, [id]);
    return res
      .status(200)
      .json({ Error: false, Code: 200, Status: 1, Message: 'Crop type deleted successfully', Payload: { id } });
  } catch (error) {
    return res.status(500).json({ Error: true, Code: 500, Status: 0, Message: error.message, Payload: {} });
  }
};

/**
 * Restore crop type (undo soft delete)
 */
export const restoreCropType = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ Error: true, Code: 400, Status: 0, Message: 'id is required', Payload: {} });
    }
    const [exists] = await db.query(`SELECT * FROM crop_types WHERE id = ?`, [id]);
    if (exists.length === 0) {
      return res.status(404).json({ Error: true, Code: 404, Status: 0, Message: 'Crop type not found', Payload: {} });
    }
    if (exists[0].status === '1') {
      return res
        .status(400)
        .json({ Error: true, Code: 400, Status: 0, Message: 'Crop type is already active', Payload: {} });
    }
    await db.query(`UPDATE crop_types SET status = '1' WHERE id = ?`, [id]);
    return res
      .status(200)
      .json({ Error: false, Code: 200, Status: 1, Message: 'Crop type restored successfully', Payload: { id } });
  } catch (error) {
    return res.status(500).json({ Error: true, Code: 500, Status: 0, Message: error.message, Payload: {} });
  }
};

/**
 * Get crop types by language code
 */
export const getCropTypes = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT * FROM crop_types WHERE status = '1'
    `);

    if (rows.length === 0) {
      return res.status(404).json({
        error: true,
        code: 404,
        status: 0,
        message: 'No crop types found for given language code',
        payload: {},
      });
    }

    return res.status(200).json({
      error: false,
      code: 200,
      status: 1,
      message: 'Crop types fetched successfully',
      payload: rows,
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      code: 500,
      status: 0,
      message: error.message,
      payload: {},
    });
  }
};

/**
 * Get crop types by language code
 */
export const getCropTypesByLanguage = async (req, res) => {
  try {
    const { languageCode } = req.body;
    if (!languageCode) {
      return res.status(400).json({
        error: true,
        code: 400,
        status: 0,
        message: 'language code is required',
        payload: {},
      });
    }
    const column = `name_${languageCode}`;
    const [rows] = await db.query(`
      SELECT id, ${column} AS name FROM crop_types WHERE status = '1'
    `);

    if (rows.length === 0) {
      return res.status(404).json({
        error: true,
        code: 404,
        status: 0,
        message: 'No crop types found for given language code',
        payload: {},
      });
    }

    return res.status(200).json({
      error: false,
      code: 200,
      status: 1,
      message: 'Crop types fetched successfully',
      payload: rows,
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      code: 500,
      status: 0,
      message: error.message,
      payload: {},
    });
  }
};

/**
 * Create Harvester
 */
export const createHarvester = async (req, res) => {
  try {
    const { name_en, name_pa, name_bgc_in, name_hi, name_raj_in } = req.body;
    if (!name_en || !name_pa || !name_bgc_in || !name_hi || !name_raj_in) {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'All language fields are required',
        Payload: {},
      });
    }

    const [result] = await db.query(
      `INSERT INTO harvesters (name_en, name_pa, name_bgc_in, name_hi, name_raj_in) VALUES (?, ?, ?, ?, ?)`,
      [name_en, name_pa, name_bgc_in, name_hi, name_raj_in]
    );

    return res.status(201).json({
      Error: false,
      Code: 201,
      Status: 1,
      Message: 'Harvester created successfully',
      Payload: { id: result.insertId },
    });
  } catch (error) {
    return res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: error.message,
      Payload: {},
    });
  }
};

/**
 * Update Harvester
 */
export const updateHarvester = async (req, res) => {
  try {
    const { id, name_en, name_pa, name_bgc_in, name_hi, name_raj_in } = req.body;
    if (!id || !name_en || !name_pa || !name_bgc_in || !name_hi || !name_raj_in) {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'id and all language fields are required',
        Payload: {},
      });
    }

    const [exists] = await db.query(`SELECT * FROM harvesters WHERE id = ?`, [id]);
    if (exists.length === 0) {
      return res.status(404).json({
        Error: true,
        Code: 404,
        Status: 0,
        Message: 'Harvester not found',
        Payload: {},
      });
    }

    await db.query(
      `UPDATE harvesters SET name_en = ?, name_pa = ?, name_bgc_in = ?, name_hi = ?, name_raj_in = ? WHERE id = ?`,
      [name_en, name_pa, name_bgc_in, name_hi, name_raj_in, id]
    );

    return res.status(200).json({
      Error: false,
      Code: 200,
      Status: 1,
      Message: 'Harvester updated successfully',
      Payload: { id },
    });
  } catch (error) {
    return res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: error.message,
      Payload: {},
    });
  }
};

/**
 * Soft Delete Harvester
 */
export const deleteHarvester = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'id is required',
        Payload: {},
      });
    }

    await db.query(`UPDATE harvesters SET status = '0' WHERE id = ?`, [id]);

    return res.status(200).json({
      Error: false,
      Code: 200,
      Status: 1,
      Message: 'Harvester deleted successfully',
      Payload: { id },
    });
  } catch (error) {
    return res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: error.message,
      Payload: {},
    });
  }
};

/**
 * Restore Harvester
 */
export const restoreHarvester = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'id is required',
        Payload: {},
      });
    }

    await db.query(`UPDATE harvesters SET status = '1' WHERE id = ?`, [id]);

    return res.status(200).json({
      Error: false,
      Code: 200,
      Status: 1,
      Message: 'Harvester restored successfully',
      Payload: { id },
    });
  } catch (error) {
    return res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: error.message,
      Payload: {},
    });
  }
};

/**
 * Get All Harvesters (by language)
 */
export const getHarvestersByLanguage = async (req, res) => {
  try {
    const { language_code } = req.body;
    const column = `name_${language_code}`;
    const validLanguages = ['en', 'pa', 'bgc_in', 'hi', 'raj_in'];

    if (!validLanguages.includes(language_code)) {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'Invalid or missing language_code',
        Payload: {},
      });
    }

    const [rows] = await db.query(`SELECT id, ${column} AS name FROM harvesters WHERE status = '1'`);

    return res.status(200).json({
      Error: false,
      Code: 200,
      Status: 1,
      Message: 'Harvesters fetched successfully',
      Payload: rows,
    });
  } catch (error) {
    return res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: error.message,
      Payload: {},
    });
  }
};

/**
 * Create transport arrangement
 */
export const createTransportArrangement = async (req, res) => {
  try {
    const { name_en, name_pa, name_bgc_in, name_hi, name_raj_in } = req.body;
    if (!name_en || !name_pa || !name_bgc_in || !name_hi || !name_raj_in) {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'All language fields are required',
        Payload: {},
      });
    }

    const [result] = await db.query(
      `INSERT INTO transport_arrangements (name_en, name_pa, name_bgc_in, name_hi, name_raj_in, status) VALUES (?, ?, ?, ?, ?, '1')`,
      [name_en, name_pa, name_bgc_in, name_hi, name_raj_in]
    );

    return res.status(201).json({
      Error: false,
      Code: 201,
      Status: 1,
      Message: 'Transport arrangement created successfully',
      Payload: { id: result.insertId },
    });
  } catch (error) {
    return res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: error.message,
      Payload: {},
    });
  }
};

/**
 * Update transport arrangement
 */
export const updateTransportArrangement = async (req, res) => {
  try {
    const { id, name_en, name_pa, name_bgc_in, name_hi, name_raj_in } = req.body;
    if (!id || !name_en || !name_pa || !name_bgc_in || !name_hi || !name_raj_in) {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'id and all name fields are required',
        Payload: {},
      });
    }

    const [exists] = await db.query(`SELECT * FROM transport_arrangements WHERE id = ?`, [id]);
    if (exists.length === 0) {
      return res.status(404).json({
        Error: true,
        Code: 404,
        Status: 0,
        Message: 'Transport arrangement not found',
        Payload: {},
      });
    }

    await db.query(
      `UPDATE transport_arrangements SET name_en = ?, name_pa = ?, name_bgc_in = ?, name_hi = ?, name_raj_in = ? WHERE id = ?`,
      [name_en, name_pa, name_bgc_in, name_hi, name_raj_in, id]
    );

    return res.status(200).json({
      Error: false,
      Code: 200,
      Status: 1,
      Message: 'Transport arrangement updated successfully',
      Payload: { id },
    });
  } catch (error) {
    return res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: error.message,
      Payload: {},
    });
  }
};

/**
 * Soft delete transport arrangement
 */
export const deleteTransportArrangement = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'id is required',
        Payload: {},
      });
    }

    await db.query(`UPDATE transport_arrangements SET status = '0' WHERE id = ?`, [id]);
    return res.status(200).json({
      Error: false,
      Code: 200,
      Status: 1,
      Message: 'Transport arrangement deleted successfully',
      Payload: { id },
    });
  } catch (error) {
    return res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: error.message,
      Payload: {},
    });
  }
};

/**
 * Restore transport arrangement
 */
export const restoreTransportArrangement = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'id is required',
        Payload: {},
      });
    }

    const [exists] = await db.query(`SELECT * FROM transport_arrangements WHERE id = ?`, [id]);
    if (exists.length === 0) {
      return res.status(404).json({
        Error: true,
        Code: 404,
        Status: 0,
        Message: 'Transport arrangement not found',
        Payload: {},
      });
    }

    if (exists[0].status === '1') {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'Transport arrangement is already active',
        Payload: {},
      });
    }

    await db.query(`UPDATE transport_arrangements SET status = '1' WHERE id = ?`, [id]);
    return res.status(200).json({
      Error: false,
      Code: 200,
      Status: 1,
      Message: 'Transport arrangement restored successfully',
      Payload: { id },
    });
  } catch (error) {
    return res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: error.message,
      Payload: {},
    });
  }
};

/**
 * Get transport arrangements by language
 */
export const getTransportArrangementsByLanguage = async (req, res) => {
  try {
    const { language_code } = req.body;

    if (!language_code) {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'language_code is required',
        Payload: {},
      });
    }

    const validLanguages = ['en', 'pa', 'bgc_in', 'hi', 'raj_in'];
    if (!validLanguages.includes(language_code)) {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'Invalid language_code',
        Payload: {},
      });
    }

    const [rows] = await db.query(`
      SELECT id, name_${language_code} AS name 
      FROM transport_arrangements 
      WHERE status = '1'
    `);

    return res.status(200).json({
      Error: false,
      Code: 200,
      Status: 1,
      Message: 'Transport arrangements fetched successfully',
      Payload: rows,
    });
  } catch (error) {
    return res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: error.message,
      Payload: {},
    });
  }
};

/**
 * Create land size unit
 */
export const createLandSizeUnit = async (req, res) => {
  try {
    const { name_en, name_pa, name_bgc_in, name_hi, name_raj_in } = req.body;
    if (!name_en || !name_pa || !name_bgc_in || !name_hi || !name_raj_in) {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'All language fields are required',
        Payload: {},
      });
    }

    const [result] = await db.query(
      `INSERT INTO land_size_units (name_en, name_pa, name_bgc_in, name_hi, name_raj_in, status) VALUES (?, ?, ?, ?, ?, '1')`,
      [name_en, name_pa, name_bgc_in, name_hi, name_raj_in]
    );

    return res.status(201).json({
      Error: false,
      Code: 201,
      Status: 1,
      Message: 'Land size unit created successfully',
      Payload: { id: result.insertId },
    });
  } catch (error) {
    return res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: error.message,
      Payload: {},
    });
  }
};

/**
 * Update land size unit
 */
export const updateLandSizeUnit = async (req, res) => {
  try {
    const { id, name_en, name_pa, name_bgc_in, name_hi, name_raj_in } = req.body;
    if (!id || !name_en || !name_pa || !name_bgc_in || !name_hi || !name_raj_in) {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'id and all name fields are required',
        Payload: {},
      });
    }

    const [exists] = await db.query(`SELECT * FROM land_size_units WHERE id = ?`, [id]);
    if (exists.length === 0) {
      return res.status(404).json({
        Error: true,
        Code: 404,
        Status: 0,
        Message: 'Land size unit not found',
        Payload: {},
      });
    }

    await db.query(
      `UPDATE land_size_units SET name_en = ?, name_pa = ?, name_bgc_in = ?, name_hi = ?, name_raj_in = ? WHERE id = ?`,
      [name_en, name_pa, name_bgc_in, name_hi, name_raj_in, id]
    );

    return res.status(200).json({
      Error: false,
      Code: 200,
      Status: 1,
      Message: ' updated successfully',
      Payload: { id },
    });
  } catch (error) {
    return res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: error.message,
      Payload: {},
    });
  }
};

/**
 * Soft delete land size unit
 */
export const deleteLandSizeUnit = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'id is required',
        Payload: {},
      });
    }

    await db.query(`UPDATE land_size_units SET status = '0' WHERE id = ?`, [id]);
    return res.status(200).json({
      Error: false,
      Code: 200,
      Status: 1,
      Message: 'Land size unit deleted successfully',
      Payload: { id },
    });
  } catch (error) {
    return res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: error.message,
      Payload: {},
    });
  }
};

/**
 * Restore land size unit
 */
export const restoreLandSizeUnit = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'id is required',
        Payload: {},
      });
    }

    const [exists] = await db.query(`SELECT * FROM land_size_units WHERE id = ?`, [id]);
    if (exists.length === 0) {
      return res.status(404).json({
        Error: true,
        Code: 404,
        Status: 0,
        Message: 'Land size unit not found',
        Payload: {},
      });
    }

    if (exists[0].status === '1') {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'Land size unit is already active',
        Payload: {},
      });
    }

    await db.query(`UPDATE land_size_units SET status = '1' WHERE id = ?`, [id]);
    return res.status(200).json({
      Error: false,
      Code: 200,
      Status: 1,
      Message: 'Land size unit restored successfully',
      Payload: { id },
    });
  } catch (error) {
    return res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: error.message,
      Payload: {},
    });
  }
};

/**
 * Get land size units
 */
export const getLandSizeUnitByLanguage = async (req, res) => {
  try {
    const { language_code } = req.body;

    if (!language_code) {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'language_code is required',
        Payload: {},
      });
    }

    const validLanguages = ['en', 'pa', 'bgc_in', 'hi', 'raj_in'];
    if (!validLanguages.includes(language_code)) {
      return res.status(400).json({
        Error: true,
        Code: 400,
        Status: 0,
        Message: 'Invalid language_code',
        Payload: {},
      });
    }

    const [rows] = await db.query(`
      SELECT id, name_${language_code} AS name 
      FROM land_size_units 
      WHERE status = '1'
    `);

    return res.status(200).json({
      Error: false,
      Code: 200,
      Status: 1,
      Message: 'Land size unit fetched successfully',
      Payload: rows,
    });
  } catch (error) {
    return res.status(500).json({
      Error: true,
      Code: 500,
      Status: 0,
      Message: error.message,
      Payload: {},
    });
  }
};

/**
 * Get combined home data including land size units, harvesters, crop types, and transport arrangements
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
export const getHomeData = async (req, res) => {
  try {
    const formatTimestamps = (rows) => {
      return rows.map((item) => ({
        ...item,
        created_at: formatDateTime(new Date(item.created_at)),
        updated_at: formatDateTime(new Date(item.updated_at)),
      }));
    };

    const [landSizeUnits] = await db.query(`SELECT * FROM land_size_units WHERE status = '1'`);
    const [harvestersRaw] = await db.query(`SELECT * FROM harvesters WHERE status = '1'`);
    const [cropTypesRaw] = await db.query(`SELECT * FROM crop_types WHERE status = '1'`);
    const [transportArrangementsRaw] = await db.query(`SELECT * FROM transport_arrangements WHERE status = '1'`);

    const harvesters = formatTimestamps(harvestersRaw);
    const cropTypes = formatTimestamps(cropTypesRaw);
    const transportArrangements = formatTimestamps(transportArrangementsRaw);

    return res.status(200).json({
      error: false,
      code: 200,
      status: 1,
      message: 'Home data fetched successfully',
      payload: {
        landSizeUnits, // Optional: format these too if needed
        harvesters,
        cropTypes,
        transportArrangements,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: true,
      code: 500,
      status: 0,
      message: error.message,
      payload: {},
    });
  }
};

/**
 * Let an authenticated user select their preferred language.
 * Requires authenticateToken to have populated req.tokenRecord.user_id.
 */
export const selectUserLanguage = async (req, res) => {
  try {
    const { userId, languageCode, languageName } = req.body;

    // 1. Validate input
    if (!userId || !languageCode || !languageName) {
      return res.status(400).json({
        error: true,
        code: 400,
        status: 0,
        message: 'user id, language code and language name are required',
        payload: {},
      });
    }

    // 2. Update the user's preferred language
    const [result] = await db.query(
      `UPDATE users
          SET language_code = ?,
              language_name = ?,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [languageCode, languageName, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: true,
        code: 404,
        status: 0,
        message: 'User not found',
        payload: {},
      });
    }

    // 3. Return the new language
    return res.status(200).json({
      error: false,
      code: 200,
      status: 1,
      message: 'Language updated successfully',
      payload: { languageCode, languageName },
    });
  } catch (error) {
    console.error('[selectUserLanguage] ', error);
    return res.status(500).json({
      error: true,
      code: 500,
      status: 0,
      message: 'Internal server error',
      payload: {},
    });
  }
};

