const express = require("express");
const router = express.Router();
const Listing = require("../models/listing.js");
const wrapAsync = require("../utils/wrapAsync.js");
const { listingSchema, reviewSchema } = require("../schema.js");
const ExpressError = require("../utils/ExpressError.js");
const { isLoggedIn, isOwner } = require("../middleware.js");
const listingController = require("../controllers/listings.js");

const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

const validateListing = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};

// Root route
router
  .route("/")
  .get(wrapAsync(listingController.index))
  .post(
    isLoggedIn,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.createListing)
  );

// New route
router.route("/new").get(isLoggedIn, listingController.renderNewform);

//category route
router.get("/category/:category", wrapAsync(async (req, res) => {
  const category = req.params.category;
  const listings = await Listing.find({ category: category });

  res.render("listings/category", { listings, category });
}));

//search route
router.get("/search",wrapAsync( async (req, res) => {
  const query = req.query.query; // Get the query from the search form

  if (!query) {
      return res.redirect("/listings"); // If no query, redirect to the homepage
  }

  try {
      // Search for listings that match the query (case-insensitive search)
      const results = await Listing.find({
          title: { $regex: query, $options: "i" } // Regex search, case insensitive
      });

      // Render search.ejs with the results and the search query
      res.render("./listings/search.ejs", {
          results: results, 
          query: query
      });
  } catch (err) {
      console.error("Search error:", err);
      res.status(500).json({ error: "Internal Server Error" });
  }
}));

// Show, Edit, Update, and Delete routes (Keep this below category)
router
.route("/:id")
.get(wrapAsync(listingController.showListing))
.put(
  isLoggedIn,
  isOwner,
  upload.single("listing[image]"),
  validateListing,
  wrapAsync(listingController.updateListing)
)
.delete(isLoggedIn, isOwner, wrapAsync(listingController.destroyListing));

// Edit form route
router.route("/:id/edit").get(isLoggedIn, isOwner, wrapAsync(listingController.renderEditForm));

module.exports = router;
