import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Shield, Mail, Calendar, Eye, Lock, Users } from 'lucide-react';

const PrivacyPolicy = () => {
  const lastUpdated = "January 18, 2025";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold">Privacy Policy</h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Kadal Shop - Web Application & Mobile App
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Last updated: {lastUpdated}</span>
            </div>
          </div>

          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Introduction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Welcome to Kadal Shop. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and mobile application (collectively, "Services"). We are committed to protecting your privacy and ensuring the security of your personal information.
              </p>
              <p>
                By accessing or using our Services, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with our policies and practices, please do not use our Services.
              </p>
            </CardContent>
          </Card>

          {/* Information We Collect */}
          <Card>
            <CardHeader>
              <CardTitle>Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Name, email address, and phone number when you create an account</li>
                  <li>Delivery addresses for order fulfillment</li>
                  <li>Payment information (processed securely through third-party providers)</li>
                  <li>Profile information and preferences</li>
                </ul>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Usage Information</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Device information (type, operating system, unique device identifiers)</li>
                  <li>App usage data and interaction patterns</li>
                  <li>IP address and location data (with your permission)</li>
                  <li>Browser type and version (for web users)</li>
                </ul>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Transaction Data</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>Order history and purchase details</li>
                  <li>Shopping cart contents and preferences</li>
                  <li>Payment transaction records</li>
                  <li>Communication with customer support</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* How We Use Information */}
          <Card>
            <CardHeader>
              <CardTitle>How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Process and fulfill your orders</li>
                <li>Provide customer support and respond to inquiries</li>
                <li>Send order confirmations, updates, and delivery notifications</li>
                <li>Improve our Services and develop new features</li>
                <li>Personalize your shopping experience</li>
                <li>Detect and prevent fraud or security issues</li>
                <li>Send promotional offers (with your consent)</li>
                <li>Comply with legal obligations</li>
              </ul>
            </CardContent>
          </Card>

          {/* Information Sharing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Information Sharing and Disclosure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>We do not sell, trade, or rent your personal information to third parties. We may share your information in the following circumstances:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><strong>Service Providers:</strong> Third-party vendors who assist with payment processing, delivery, and app functionality</li>
                <li><strong>Shop Owners:</strong> Order details shared with sellers for order fulfillment</li>
                <li><strong>Legal Requirements:</strong> When required by law, court order, or government regulations</li>
                <li><strong>Business Transfers:</strong> In case of merger, acquisition, or asset sale</li>
                <li><strong>Safety and Security:</strong> To protect our users and prevent fraud</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Data Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Secure data transmission using SSL/TLS encryption</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Secure payment processing through certified providers</li>
                <li>Regular data backups and recovery procedures</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
              </p>
            </CardContent>
          </Card>

          {/* Mobile App Specific */}
          <Card>
            <CardHeader>
              <CardTitle>Mobile App Specific Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>When you use our mobile application, we may collect additional information:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><strong>Device Permissions:</strong> Camera (for product photos), Storage (for image uploads), Location (for delivery)</li>
                <li><strong>Push Notifications:</strong> Order updates and promotional messages (with your consent)</li>
                <li><strong>App Analytics:</strong> Usage statistics to improve app performance</li>
                <li><strong>Crash Reports:</strong> Automatic crash reporting for app stability</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                You can manage app permissions through your device settings at any time.
              </p>
            </CardContent>
          </Card>

          {/* Your Rights */}
          <Card>
            <CardHeader>
              <CardTitle>Your Privacy Rights</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><strong>Access:</strong> Request access to your personal information</li>
                <li><strong>Update:</strong> Correct or update your information through your account settings</li>
                <li><strong>Delete:</strong> Request deletion of your personal information</li>
                <li><strong>Opt-out:</strong> Unsubscribe from promotional communications</li>
                <li><strong>Data Portability:</strong> Request a copy of your data in a structured format</li>
                <li><strong>Restrict Processing:</strong> Limit how we use your information</li>
              </ul>
            </CardContent>
          </Card>

          {/* Third-Party Services */}
          <Card>
            <CardHeader>
              <CardTitle>Third-Party Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Our Services may integrate with third-party services:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><strong>Payment Processors:</strong> Razorpay for secure payment processing</li>
                <li><strong>Authentication:</strong> Supabase for user authentication and data storage</li>
                <li><strong>Analytics:</strong> Services to understand app usage and improve performance</li>
                <li><strong>Google Play Services:</strong> For Android app functionality and distribution</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                These third-party services have their own privacy policies. We encourage you to review them.
              </p>
            </CardContent>
          </Card>

          {/* Children's Privacy */}
          <Card>
            <CardHeader>
              <CardTitle>Children's Privacy</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Our Services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us to have it removed.
              </p>
            </CardContent>
          </Card>

          {/* Changes to Privacy Policy */}
          <Card>
            <CardHeader>
              <CardTitle>Changes to This Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. For significant changes, we may provide additional notice through email or in-app notifications.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Contact Us
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                If you have any questions about this Privacy Policy or our privacy practices, please contact us:
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p><strong>Email:</strong> privacy@kadalshop.com</p>
                <p><strong>Support:</strong> support@kadalshop.com</p>
                <p><strong>Address:</strong> [Your Business Address]</p>
                <p><strong>Phone:</strong> [Your Contact Number]</p>
              </div>
              <p className="text-sm text-muted-foreground">
                We will respond to your inquiry within 30 days.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;