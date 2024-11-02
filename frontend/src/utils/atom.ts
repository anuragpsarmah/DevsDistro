import { atom, RecoilState } from "recoil";

interface User {
  _id: string;
  username: string;
  name: string;
  profileImageUrl: string;
}

const user: RecoilState<User> = atom({
  key: "user",
  default: {
    _id: "",
    username: "",
    name: "",
    profileImageUrl: "",
  },
});

export { user };
