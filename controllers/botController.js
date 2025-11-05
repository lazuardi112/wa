const db = require('../models');

// @desc    Create a new bot flow
// @route   POST /api/v1/bot/create
// @access  Private
const createBotFlow = async (req, res) => {
    const { deviceId, prefix, response, parentId } = req.body;
    const userId = req.user.id;

    if (!deviceId || !prefix || !response) {
        return res.status(400).redirect('/bot?status=error&msg=All%20fields%20are%20required.');
    }

    try {
        // Verify the user owns the device
        const device = await db.Device.findOne({ where: { id: deviceId, userId } });
        if (!device) {
            return res.status(403).redirect('/bot?status=error&msg=Device%20not%20found%20or%20not%20owned.');
        }

        await db.BotFlow.create({
            userId,
            deviceId,
            prefix,
            response,
            isEnabled: true,
            parentId: parentId || null,
        });

        res.redirect('/bot?status=success&msg=Bot%20flow%20created%20successfully.');
    } catch (error) {
        console.error('Error creating bot flow:', error);
        res.status(500).redirect('/bot?status=error&msg=Internal%20server%20error.');
    }
};

// @desc    Toggle the isEnabled status of a bot flow
// @route   POST /api/v1/bot/toggle/:id
// @access  Private
const toggleBotFlow = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const flow = await db.BotFlow.findOne({ where: { id, userId } });
        if (!flow) {
            return res.status(404).redirect('/bot?status=error&msg=Bot%20flow%20not%20found.');
        }

        flow.isEnabled = !flow.isEnabled;
        await flow.save();

        res.redirect('/bot?status=success&msg=Bot%20flow%20status%20updated.');
    } catch (error) {
        console.error('Error toggling bot flow:', error);
        res.status(500).redirect('/bot?status=error&msg=Internal%20server%20error.');
    }
};

// @desc    Delete a bot flow
// @route   POST /api/v1/bot/delete/:id
// @access  Private
const deleteBotFlow = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const result = await db.BotFlow.destroy({ where: { id, userId } });
        if (result === 0) {
            return res.status(404).redirect('/bot?status=error&msg=Bot%20flow%20not%20found.');
        }

        res.redirect('/bot?status=success&msg=Bot%20flow%20deleted%20successfully.');
    } catch (error) {
        console.error('Error deleting bot flow:', error);
        res.status(500).redirect('/bot?status=error&msg=Internal%20server%20error.');
    }
};

// @desc    Update a bot flow
// @route   POST /api/v1/bot/update/:id
// @access  Private
const updateBotFlow = async (req, res) => {
    const { id } = req.params;
    const { deviceId, prefix, response, parentId } = req.body;
    const userId = req.user.id;

    if (!deviceId || !prefix || !response) {
        return res.status(400).redirect(`/bot/edit/${id}?status=error&msg=All%20fields%20are%20required.`);
    }

    try {
        const flow = await db.BotFlow.findOne({ where: { id, userId } });
        if (!flow) {
            return res.status(404).redirect('/bot?status=error&msg=Bot%20flow%20not%20found.');
        }

        // Verify the user owns the new device if it's changed
        if (flow.deviceId !== deviceId) {
            const device = await db.Device.findOne({ where: { id: deviceId, userId } });
            if (!device) {
                return res.status(403).redirect(`/bot/edit/${id}?status=error&msg=Device%20not%20found%20or%20not%20owned.`);
            }
        }

        await flow.update({
            deviceId,
            prefix,
            response,
            parentId: parentId || null,
        });

        res.redirect('/bot?status=success&msg=Bot%20flow%20updated%20successfully.');
    } catch (error) {
        console.error('Error updating bot flow:', error);
        res.status(500).redirect(`/bot/edit/${id}?status=error&msg=Internal%20server%20error.`);
    }
};
module.exports = {
    createBotFlow,
    toggleBotFlow,
    deleteBotFlow,
    updateBotFlow,
};
