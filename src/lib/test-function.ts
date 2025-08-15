import { supabase } from "@/integrations/supabase/client";

const testFunction = async () => {
  console.log('🧪 Testing edge function...');
  
  const response = await supabase.functions.invoke('test-function', {
    body: { test: 'data' }
  });
  
  console.log('🧪 Test response:', response);
  return response;
};

export { testFunction };