const translate = require('translate-google');

exports.translateCV = async (req, res) => {
    try {
        const { textObject, to } = req.body;

        if (!textObject || !to) {
            return res.status(400).json({ error: 'Text object and target language are required' });
        }
        if (typeof textObject !== 'object') {
            return res.status(400).json({ error: 'Text object must be an object' });
        }

        const translations = {};
        for (const [key, value] of Object.entries(textObject)) {
            if (typeof value === 'string') {
                if (/^bg-[a-zA-Z0-9-]+$/.test(value) || /^#[0-9A-Fa-f]{6}$/.test(value)) {
                    translations[key] = value;
                } else {
                    try {
                        const translatedText = await translate(value, { to });
                        translations[key] = translatedText;
                    } catch (error) {
                        console.error(`Error translating ${key}:`, error.message);
                        translations[key] = value;
                    }
                }
            } else {
                translations[key] = value;
            }
        }

        res.status(200).json({ translations });
    } catch (error) {
        console.error('Server error:', error.message);
        res.status(500).json({ error: 'Failed to translate text object' });
    }
};
