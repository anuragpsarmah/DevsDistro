import { useState } from "react";
import { Star, Briefcase, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

const jobRoles = [
  "Software Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "Mobile Developer",
  "DevOps Engineer",
  "Data Scientist",
  "UI/UX Designer",
  "Product Manager",
  "QA Engineer",
  "Full Stack Developer",
  "Student",
  "Other",
];

const cities = [
  "New York",
  "Los Angeles",
  "Chicago",
  "Houston",
  "Phoenix",
  "Philadelphia",
  "San Antonio",
  "San Diego",
  "Dallas",
  "San Jose",
  "New Delhi",
  "Mumbai",
  "Bangalore",
  "London",
  "Paris",
  "Tokyo",
  "Shanghai",
  "Sydney",
];

export default function AccountSettingsTab() {
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(0);
  const [cityInput, setCityInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleReviewChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= 200) {
      setReview(e.target.value);
    }
  };

  const filteredCities = cities.filter((city) =>
    city.toLowerCase().includes(cityInput.toLowerCase())
  );

  return (
    <div className="space-y-6 mt-6 lg:mt-0 md:mt-0">
      <h1 className="text-4xl text-center md:text-left lg:text-left font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 animate-gradient-x">
        Account Settings
      </h1>

      <div className="bg-gray-800 rounded-xl p-8 shadow-lg">
        <div className="flex flex-col md:flex-row items-center md:items-start mb-8">
          <div className="relative mb-6 md:mb-0 md:mr-8">
            <div className="w-40 h-40 rounded-full overflow-hidden ring-4 ring-purple-500 ring-offset-4 ring-offset-gray-800">
              <img
                src="/placeholder.svg"
                alt="User Avatar"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-bold text-gray-100 mb-2">John Doe</h2>
            <p className="text-gray-400 flex items-center justify-center md:justify-start mb-2">
              <Briefcase className="w-4 h-4 mr-2" />
              Software Engineer
            </p>
            <p className="text-gray-400 flex items-center justify-center md:justify-start">
              <MapPin className="w-4 h-4 mr-2" />
              San Francisco, CA
            </p>
          </div>
        </div>

        <Separator className="my-8 bg-gray-700" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <Label
                htmlFor="github-username"
                className="text-gray-300 mb-2 block"
              >
                GitHub Username
              </Label>
              <Input
                id="github-username"
                value="johndoe"
                readOnly
                className="bg-gray-700 text-gray-300 border-gray-600 focus:ring-0 focus:border-white focus:border-[0.5px] transition-colors"
              />
            </div>

            <div>
              <Label htmlFor="name" className="text-gray-300 mb-2 block">
                Name
              </Label>
              <Input
                id="name"
                value="John Doe"
                readOnly
                className="bg-gray-700 text-gray-300 border-gray-600 focus:ring-0 focus:border-white focus:border-[0.5px] transition-colors"
              />
            </div>

            <div>
              <Label htmlFor="job-role" className="text-gray-300 mb-2 block">
                Job Role
              </Label>
              <Select>
                <SelectTrigger className="w-full bg-gray-700 text-gray-300 border-gray-600 focus:ring-0 focus:border-white focus:border-[0.5px] transition-colors">
                  <SelectValue placeholder="Select a job role" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 text-gray-300 border-gray-600">
                  {jobRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <Label htmlFor="city" className="text-gray-300 mb-2 block">
                City
              </Label>
              <Input
                id="city"
                value={cityInput}
                onChange={(e) => {
                  setCityInput(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                placeholder="Enter your city"
                className="bg-gray-700 text-gray-300 border-gray-600 focus:ring-0 focus:border-white focus:border-[0.5px] transition-colors"
              />
              {showSuggestions && cityInput && (
                <div className="absolute w-full z-10 mt-1 bg-gray-700 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                  {filteredCities.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-gray-400">
                      No cities found
                    </div>
                  ) : (
                    filteredCities.map((city) => (
                      <div
                        key={city}
                        className="px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 cursor-pointer"
                        onClick={() => {
                          setCityInput(city);
                          setShowSuggestions(false);
                        }}
                      >
                        {city}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="review" className="text-gray-300 mb-2 block">
                Review
              </Label>
              <Textarea
                id="review"
                placeholder="Write your review here..."
                value={review}
                onChange={handleReviewChange}
                className="bg-gray-700 text-gray-300 border-gray-600 focus:ring-0 focus:border-white focus:border-[0.5px] transition-colors h-32 resize-none"
              />
              <p className="text-sm text-gray-400 mt-1">
                {review.length}/200 characters
              </p>
            </div>

            <div>
              <Label className="text-gray-300 mb-2 block">Rating</Label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-8 h-8 cursor-pointer transition-colors duration-200 ${
                      star <= rating
                        ? "text-purple-500 fill-purple-500"
                        : "text-gray-600 hover:text-gray-400"
                    }`}
                    strokeWidth={1.5}
                    onClick={() => setRating(star)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8 bg-gray-700" />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-200">
                Profile Visibility
              </h3>
              <p className="text-sm text-gray-400">
                Allow others to see your profile
              </p>
            </div>
            <Switch />
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button className="bg-gradient-to-r from-blue-400 to-purple-500 hover:from-blue-500 hover:to-purple-600 text-white font-semibold py-2 px-6 rounded-md transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
