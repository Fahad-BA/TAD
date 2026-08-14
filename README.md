# TAD — TikTok Account Details

واجهة SPA عربية RTL لاستخراج تفاصيل حسابات TikTok من مصادر حقيقية.

## تشغيل

```bash
npm install
npm run dev
```

## جلب الدولة/المنطقة

عند ترك الإعدادات المتقدمة فارغة، يحاول التطبيق بالترتيب:

1. صفحة TikTok العامة وبيانات SSR JSON المضمّنة فيها.
2. نقطة TikWM العامة كبديل بدون مفتاح.

يتم استخراج `region` أو `regionCode` أو `countryCode` (وأسماء الحقول المقابلة) من استجابة المصدر. إذا لم تُرجع المصادر دولة، يعرض التطبيق خطأ بدلاً من تخمين دولة.

يمكن أيضاً إدخال Custom API Endpoint. استخدم `{username}` كعنصر نائب اختياري؛ وسيُرسل API Key في رأسي `Authorization: Bearer` و`X-API-Key`.