
import { dbContext } from "../db/DbContext";
import { BadRequest } from "../utils/Errors"

// Private Methods

/**
 * Creates profile if one does not exist
 * @param {any} profile
 * @param {any} user
 */
async function createProfileIfNeeded(profile, user) {
  if (!profile) {
    profile = await dbContext.Profile.create({
      ...user,
      subs: [user.sub]
    });
  }
  return profile;
}

/**
 * Adds sub to profile if not already on profile
 * @param {any} profile
 * @param {any} user
 */
async function mergeSubsIfNeeded(profile, user) {
  if (!profile.subs.includes(user.sub)) {
    // @ts-ignore
    profile.subs.push(user.sub);
    await profile.save();
  }
}
/**
 * Restricts changes to the body of the profile object
 * @param {any} body
 */
function sanitizeBody(body) {
  let writable = {
    name: body.name,
    picture: body.picture,
    steamId: body.steamId,
    channels: body.channels
  };
  return writable;
}

class ProfileService {
  async updateUserChannels(user, data) {
    let channels =  sanitizeBody({channels: data}).channels
    let profile = await dbContext.Profile.findOneAndUpdate(
      { email: user.email },
      { $push: {channels}},
      { runValidators: true, setDefaultsOnInsert: true, new: true }
    );
    return profile;
  }

  /**
   * Provided an array of user emails will return an array of user profiles with email picture and name
   * @param {String[]} emails Array of email addresses to lookup users by
   */
  async getProfiles(emails = []) {
    let profiles = await dbContext.Profile.find({
      email: { $in: emails }
    }).select("email picture name channels");
    return profiles;
  }

  //Provided a user Id, returns all rooms where that user is the creator
  async getUserRooms(user) {
    let data = await dbContext.Rooms.find({ creatorEmail: user.email })
    if (!data) {
      throw new BadRequest("Invalid ID")
    }
    return data
  }

  /**
   * Returns a user profile from the Auth0 user object
   *
   * Creates user if none exists
   *
   * Adds sub of Auth0 account to profile if not currently on profile
   * @param {any} user
   */
  async getProfile(user) {
    let profile = await dbContext.Profile.findOne({
      email: user.email
    });
    profile = await createProfileIfNeeded(profile, user);
    await mergeSubsIfNeeded(profile, user);
    return profile;
  }
  /**
     * Updates profile with the request body, will only allow changes to editable fields
     * @param {any} user Auth0 user object
     * @param {any} body Updates to apply to user object
     */
  async updateProfile(user, body) {
    let update = sanitizeBody(body);
    let profile = await dbContext.Profile.findOneAndUpdate(
      { email: user.email },
      { $set: update },
      { runValidators: true, setDefaultsOnInsert: true, new: true }
    );
    return profile;
  }
}
export const profilesService = new ProfileService();
