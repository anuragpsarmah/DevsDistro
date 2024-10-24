import { Request, Response } from "express";
import { User } from "../models/user.model";
import { encrypt } from "../utils/encryption.util";
import asyncHandler from "../utils/async-handler.util";
import response from "../utils/response.util";
import ApiError from "../utils/ApiError.util";
import jwt from "jsonwebtoken";
import axios from "axios";

const githubLogin = asyncHandler(async (req: Request, res: Response) => {
  const code = req.query.code;
  const client_id = process.env.GITHUB_CLIENT_ID;
  const client_secret = process.env.GITHUB_CLIENT_SECRET;

  try {
    const accessTokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id,
        client_secret,
        code,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );

    if (accessTokenResponse.data.error) {
      console.log(accessTokenResponse.data.error);
      response(res, 401, "Unauthorized Access");
      return;
    }

    const access_token = accessTokenResponse.data.access_token;
    const encrypted_access_token = encrypt(
      access_token,
      process.env.ENCRYPTION_KEY_32 as string,
      process.env.ENCRYPTION_IV as string
    );

    const userGH = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: "Bearer " + access_token,
      },
    });

    const userDB = await User.findOne({ username: userGH.data.login });

    let _id,
      name,
      username,
      profile_image_url,
      session_token,
      refresh_token,
      github_access_token;

    if (userDB) {
      _id = userDB._id;
      name = userDB.name;
      username = userDB.username;
      profile_image_url = userDB.profile_image_url;
      github_access_token = encrypted_access_token;

      session_token = jwt.sign(
        {
          _id,
          username,
        },
        process.env.JWT_SECRET as string,
        {
          expiresIn: "15m",
        }
      );

      refresh_token = jwt.sign(
        {
          _id,
        },
        process.env.JWT_SECRET as string,
        {
          expiresIn: "30d",
        }
      );

      userDB.jwt_refresh_token = refresh_token;
      userDB.github_access_token = github_access_token;
      await userDB.save();
    } else {
      const newUserDB = await User.create({
        name: userGH.data.name || "",
        username: userGH.data.login,
        profile_image_url: userGH.data.avatar_url,
        github_access_token: encrypted_access_token,
      });

      _id = newUserDB._id;
      name = userGH.data.name;
      username = userGH.data.login;
      profile_image_url = userGH.data.avatar_url;
      github_access_token = encrypted_access_token;

      session_token = jwt.sign(
        {
          _id,
          username,
        },
        process.env.JWT_SECRET as string,
        {
          expiresIn: "15m",
        }
      );

      refresh_token = jwt.sign(
        {
          _id,
        },
        process.env.JWT_SECRET as string,
        {
          expiresIn: "30d",
        }
      );

      newUserDB.jwt_refresh_token = refresh_token;
      await newUserDB.save();
    }

    res
      .status(200)
      .cookie("session_token", session_token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      })
      .cookie("refresh_token", refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      })
      .json({
        message: "User logged in successfully",
        data: {
          _id,
          name,
          username,
          profile_image_url,
        },
        error: {},
      });
  } catch (error) {
    throw new ApiError("Internal Server Error", 500);
  }
});

export { githubLogin };
