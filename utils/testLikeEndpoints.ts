// Utility to test different like endpoints for debugging
export const testLikeEndpoints = async (token: string, postId: string) => {
  console.log('🔬 Testing like endpoints for post:', postId);
  
  const endpoints = [
    {
      name: 'Community Posts Like (Primary)',
      url: `https://social-backend-y1rg.onrender.com/community/posts/${postId}/like`,
      method: 'POST',
      headers: { 'token': token, 'Content-Type': 'application/json' },
    },
    {
      name: 'Community Post Like (Alternative)',
      url: `https://social-backend-y1rg.onrender.com/community/post/${postId}/like`,
      method: 'POST',
      headers: { 'token': token, 'Content-Type': 'application/json' },
    },
    {
      name: 'Post Like (General)',
      url: `https://social-backend-y1rg.onrender.com/post/like`,
      method: 'POST',
      headers: { 'token': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    },
    {
      name: 'Post Like (Alternative)',
      url: `https://social-backend-y1rg.onrender.com/post/${postId}/like`,
      method: 'POST',
      headers: { 'token': token, 'Content-Type': 'application/json' },
    },
  ];

  const results: Array<{
    name: string;
    status: number | null;
    success: boolean;
    data?: any;
    error?: string;
  }> = [];

  for (const endpoint of endpoints) {
    try {
      console.log(`  Testing: ${endpoint.name}`);
      console.log(`    URL: ${endpoint.url}`);
      
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: endpoint.headers,
        body: endpoint.body,
      });
      
      console.log(`    Status: ${response.status} ${response.statusText}`);
      
      const responseText = await response.text();
      let data = null;
      
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        data = responseText;
      }
      
      results.push({
        name: endpoint.name,
        status: response.status,
        success: response.ok,
        data,
        error: response.ok ? undefined : data?.message || responseText || 'Unknown error'
      });
      
      console.log(`    Success: ${response.ok}`);
      if (response.ok) {
        console.log(`    ✅ ${endpoint.name} works!`);
        console.log(`    Response:`, data);
      } else {
        console.log(`    ❌ ${endpoint.name} failed:`, data?.message || responseText);
      }
      
    } catch (error: any) {
      console.log(`    💥 Network/Other Error:`, error?.message);
      results.push({
        name: endpoint.name,
        status: null,
        success: false,
        error: error?.message || 'Network error'
      });
    }
    
    console.log(''); // Empty line for readability
  }

  console.log('🔬 Test Results Summary:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`  ${status} ${result.name}: ${result.success ? 'SUCCESS' : result.error}`);
  });

  const workingEndpoints = results.filter(r => r.success);
  if (workingEndpoints.length > 0) {
    console.log(`\n🎉 Found ${workingEndpoints.length} working endpoint(s)!`);
    return workingEndpoints[0]; // Return the first working endpoint
  } else {
    console.log('\n😞 No working endpoints found.');
    return null;
  }
};
