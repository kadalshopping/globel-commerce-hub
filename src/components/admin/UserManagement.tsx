import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  ShoppingBag,
  Eye,
  Filter,
  Download
} from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
  email?: string;
  order_count?: number;
  delivery_addresses?: any[];
}

export const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // First, get all user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setUsers([]);
        return;
      }

      // Get user emails from auth.users (this requires admin access)
      const userIds = profiles.map(p => p.user_id);
      
      // Get order counts for each user
      const { data: orderCounts, error: orderError } = await supabase
        .from('orders')
        .select('user_id')
        .in('user_id', userIds);

      if (orderError) {
        console.error('Error fetching order counts:', orderError);
      }

      // Count orders per user
      const orderCountMap = orderCounts?.reduce((acc, order) => {
        acc[order.user_id] = (acc[order.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Get delivery addresses for each user
      const { data: addresses, error: addressError } = await supabase
        .from('delivery_addresses')
        .select('user_id, name, address, city, state, pincode, phone, is_default')
        .in('user_id', userIds);

      if (addressError) {
        console.error('Error fetching addresses:', addressError);
      }

      // Group addresses by user
      const addressMap = addresses?.reduce((acc, addr) => {
        if (!acc[addr.user_id]) acc[addr.user_id] = [];
        acc[addr.user_id].push(addr);
        return acc;
      }, {} as Record<string, any[]>) || {};

      // Try to get emails from auth metadata (this may not work due to RLS)
      const usersWithDetails = profiles.map(profile => ({
        ...profile,
        order_count: orderCountMap[profile.user_id] || 0,
        delivery_addresses: addressMap[profile.user_id] || [],
        email: 'Contact admin for email access' // Placeholder since we can't access auth.users directly
      }));

      setUsers(usersWithDetails);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch user data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.phone?.includes(searchTerm) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  const totalUsers = users.length;
  const totalOrders = users.reduce((sum, user) => sum + (user.order_count || 0), 0);
  const usersWithOrders = users.filter(user => (user.order_count || 0) > 0).length;

  const exportUserData = () => {
    const csvContent = [
      ['Name', 'Phone', 'Registration Date', 'Orders', 'Primary Address'].join(','),
      ...filteredUsers.map(user => [
        user.full_name || 'N/A',
        user.phone || 'N/A',
        new Date(user.created_at).toLocaleDateString(),
        user.order_count || 0,
        user.delivery_addresses?.[0]?.address || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            User Management
          </h2>
          <Badge variant="outline" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {totalUsers} Total Users
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportUserData}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchUsers}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Active Customers</p>
                <p className="text-2xl font-bold">{usersWithOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Orders/User</p>
                <p className="text-2xl font-bold">
                  {totalUsers > 0 ? (totalOrders / totalUsers).toFixed(1) : '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No users found matching your search.' : 'No users registered yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Registration</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar_url || ''} />
                            <AvatarFallback>
                              {user.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {user.full_name || 'No name provided'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              ID: {user.user_id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3" />
                            {user.phone || 'Not provided'}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          {new Date(user.created_at).toLocaleDateString()}
                          <br />
                          <span className="text-muted-foreground">
                            {new Date(user.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant={user.order_count! > 0 ? 'default' : 'secondary'}>
                          {user.order_count || 0} orders
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="max-w-[200px]">
                          {user.delivery_addresses && user.delivery_addresses.length > 0 ? (
                            <div className="text-sm">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="font-medium">
                                  {user.delivery_addresses[0].name}
                                </span>
                              </div>
                              <p className="text-muted-foreground truncate">
                                {user.delivery_addresses[0].address}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {user.delivery_addresses[0].city}, {user.delivery_addresses[0].state}
                              </p>
                              {user.delivery_addresses.length > 1 && (
                                <Badge variant="outline" className="mt-1">
                                  +{user.delivery_addresses.length - 1} more
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              No address provided
                            </span>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>User Details</DialogTitle>
                            </DialogHeader>
                            {selectedUser && (
                              <UserDetailsDialog user={selectedUser} />
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

interface UserDetailsDialogProps {
  user: UserProfile;
}

const UserDetailsDialog = ({ user }: UserDetailsDialogProps) => {
  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground">Full Name</label>
          <p className="mt-1">{user.full_name || 'Not provided'}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
          <p className="mt-1">{user.phone || 'Not provided'}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Registration Date</label>
          <p className="mt-1">{new Date(user.created_at).toLocaleString()}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Total Orders</label>
          <p className="mt-1">{user.order_count || 0}</p>
        </div>
      </div>

      {/* Delivery Addresses */}
      <div>
        <label className="text-sm font-medium text-muted-foreground">
          Delivery Addresses ({user.delivery_addresses?.length || 0})
        </label>
        <div className="mt-2 space-y-3">
          {user.delivery_addresses && user.delivery_addresses.length > 0 ? (
            user.delivery_addresses.map((address, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{address.name}</span>
                      {address.is_default && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {address.address}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {address.city}, {address.state} - {address.pincode}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Phone: {address.phone}
                    </p>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">No delivery addresses added</p>
          )}
        </div>
      </div>
    </div>
  );
};