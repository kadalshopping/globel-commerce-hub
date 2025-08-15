import { DeliveryAddressManagement } from "@/components/user/DeliveryAddressManagement";

const UserProfile = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <DeliveryAddressManagement />
      </div>
    </div>
  );
};

export default UserProfile;