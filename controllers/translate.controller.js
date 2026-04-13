const gTranslate = require('google-translate-api-x');
const User = require('../models/User');
const Links = require('../models/Links');

async function translate(input, options) {
  if (typeof input === 'string') {
    const res = await gTranslate(input, options);
    return res.text;
  }
  if (Array.isArray(input)) {
    const res = await gTranslate(input, options);
    return res.map(r => r.text);
  }
  if (typeof input === 'object' && input !== null) {
    const keys = Object.keys(input);
    const values = keys.map(k => input[k]);
    const res = await gTranslate(values, options);
    const translatedObj = {};
    keys.forEach((k, idx) => {
      translatedObj[k] = res[idx].text;
    });
    return translatedObj;
  }
  return input;
}

const labelsToTranslate = {
  summary: "Summary",
  services: "Services",
  education: "Education",
  experience: "Experience",
  skills: "Skills",
  languages: "Languages",
  businessLinks : "BusinessLinks"
};

exports.getUserByUsernameTranslated = async (req, res) => {
  const { username, lang } = req.params;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    const links = await Links.find({ useremail: user.email });

    // ✅ الحقول التي نريد ترجمتها
    const translatedUser = { ...user._doc };
    const fieldsToTranslate = [
      "country",
      "languages",
      "services",
      "bio",
      "category",
      "skills",
      "education",
      "experience",
    ];

    // 🔁 ترجمة الحقول المطلوبة
    for (const field of fieldsToTranslate) {
      if (translatedUser[field]) {
        try {
          translatedUser[field] = await translate(translatedUser[field], { to: lang });
        } catch (err) {
          console.warn(`⚠️ Failed to translate ${field}:`, err.message);
        }
      }
    }

    // 🌐 ترجمة أسماء الروابط فقط
    const translatedLinks = await Promise.all(
      links.map(async (link) => ({
        ...link._doc,
        namelink: await translate(link.namelink, { to: lang }),
      }))
    );

    const translatedLabels = await translate(labelsToTranslate, { to: lang });
    const finalLabels = {};
    for (const key in translatedLabels) {
      finalLabels[key] = translatedLabels[key];
    }

    res.status(200).json({
      user: translatedUser,
      links: translatedLinks,
      labels: finalLabels,
      lang,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
