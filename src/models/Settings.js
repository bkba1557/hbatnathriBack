import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: "site", unique: true },
    restaurantName: { type: String, default: "حبة نثري" },
    locationUrl: { type: String, default: "https://maps.google.com/?q=حبة%20نثري" },
    phones: {
      banquet: { type: String, default: "0558430222" },
      takeawayMobile: { type: String, default: "0558360222" },
      takeawayLandline: { type: String, default: "0165313222" },
      deliveryMobile: { type: String, default: "0558360222" },
      deliveryLandline: { type: String, default: "0165313222" },
      complaintsWhatsapp: { type: String, default: "0537004881" },
    },
    socialLinks: {
      snapchat: { type: String, default: "https://www.snapchat.com/explore/hbat--nathri" },
      tiktok: { type: String, default: "https://www.tiktok.com/@hbat.nathri?_r=1&_t=ZS-96ctVxrLYbA" },
      instagram: { type: String, default: "https://www.instagram.com/hbat.nathri/" },
    },
  },
  { timestamps: true }
);

export const Settings = mongoose.model("Settings", settingsSchema);
