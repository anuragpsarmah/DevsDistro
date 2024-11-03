import { atom, RecoilState } from "recoil";
import { User } from "@/types/types";

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
