import { User } from "@/types/recoil.types";
import { atom, RecoilState } from "recoil";

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