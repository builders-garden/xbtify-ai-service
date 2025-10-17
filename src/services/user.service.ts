export const fetchUserData = async () => {
  try {
    // doing something here
    console.log("[user.service]: fetchUserData called");

    return {
      user: {
        fid: 4461,
        username: "limone",
      },
    };
  } catch (error) {
    console.error("[user.service]:", error);
    throw error;
  }
};
