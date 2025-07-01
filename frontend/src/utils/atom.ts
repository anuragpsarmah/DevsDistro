import { atom, RecoilState } from "recoil";
import { User } from "@/utils/types";

const user: RecoilState<User> = atom({
  key: "user",
  default: {
    _id: "",
    username: "",
    name: "",
    profile_image_url: "",
  },
});

const userCurrency = atom<string | null>({
  key: "userCurrency",
  default: null,
});

export { user, userCurrency };
