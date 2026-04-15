exports.getDivision = (req) => {
    // 1. Check the secure frontend header first (Safest for GET requests)
    let division = req.headers['x-division-id'];

    // 2. Fallback to request body (For POST/PUT requests)
    if (!division && req.body && req.body.division) {
        division = req.body.division;
    }

    // 3. Fallback to the authenticated user object
    if (!division && req.user && req.user.division) {
        division = req.user.division;
    }

    // 4. Clean the output: If it's a full Mongoose object, extract just the string ID
    if (typeof division === 'object' && division !== null) {
        return division._id ? division._id.toString() : division.toString();
    }

    return division;
};