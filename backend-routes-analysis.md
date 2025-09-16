# Backend Routes Analysis & Frontend API Alignment

## 🔍 Backend Routes vs Frontend API Comparison

### ✅ **Correctly Aligned Routes:**

1. **GET /community** → `getAllCommunities()` ✅
2. **POST /community** → `createCommunity()` ✅
3. **GET /community/:id** → `getCommunityById()` ✅
4. **PUT /community/:id** → `updateCommunity()` ✅
5. **DELETE /community/:id** → `deleteCommunity()` ✅
6. **POST /community/:id/join** → `joinCommunity()` ✅
7. **POST /community/:id/leave** → `leaveCommunity()` ✅

### ❌ **Misaligned Routes Found:**

## 1. **User Communities Endpoint**
**Backend:** `GET /community/user`
**Frontend:** Calls `GET /user/getUser`

```typescript
// CURRENT (WRONG)
const response = await fetchWithRetry(`${API_BASE_URL}/user/getUser`, {

// SHOULD BE (CORRECT)
const response = await fetchWithRetry(`${API_BASE_URL}/community/user`, {
```

## 2. **Community Posts Endpoints**
**Backend:** `GET /community/:id/posts`
**Frontend:** ✅ Correct

**Backend:** `POST /community/:id/posts` 
**Frontend:** ✅ Correct

## 3. **Home Feed Endpoint**
**Backend:** `GET /community/feed/home`
**Frontend:** Calls `GET /post/feed/home`

```typescript
// CURRENT (WRONG)
const response = await fetch(`${API_BASE_URL}/post/feed/home?${queryParams}`, {

// SHOULD BE (CORRECT)
const response = await fetch(`${API_BASE_URL}/community/feed/home?${queryParams}`, {
```

## 4. **Post Like/Comment Endpoints**
**Backend:** `POST /community/posts/:postId/like`
**Frontend:** ✅ Correct

**Backend:** `POST /community/posts/:postId/comments`
**Frontend:** ✅ Correct

## 5. **Moderation Endpoints**
**Backend:** `POST /community/posts/:postId/pin`
**Frontend:** ✅ Correct

**Backend:** `DELETE /community/posts/:postId`
**Frontend:** ✅ Correct

## 6. **Member Management Endpoints**
**Backend:** `POST /community/requests/:requestId/handle`
**Frontend:** ✅ Correct

**Backend:** `POST /community/:id/members/:memberId/role`
**Frontend:** ✅ Correct

**Backend:** `DELETE /community/:id/members/:memberId`
**Frontend:** ✅ Correct

---

## 🔧 **Required Frontend Fixes:**

### Fix 1: Update `getUserCommunities()` function
### Fix 2: Update `getHomeFeedWithCommunities()` function

## 📋 **Backend Route Authentication Status:**
- **POST /community** ✅ Has `authMiddleware` (This should work once routes are aligned)
- All protected routes have proper `authMiddleware`

## 🎯 **Next Steps:**
1. Fix the 2 misaligned endpoints in frontend
2. Test community creation again
3. The auth middleware issue might resolve once endpoints are correct
