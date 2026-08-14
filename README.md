# TAD — TikTok Account Details

واجهة SPA عربية RTL لاستخراج تفاصيل حسابات TikTok من مصادر حقيقية.

## تشغيل

```bash
npm install
cp .env.example .env
npm run dev
```

## إعداد RapidAPI TikTok Scraper

اضبط قيم RapidAPI في `.env` قبل تشغيل Vite:

- `VITE_RAPIDAPI_KEY`: مفتاح RapidAPI.
- `VITE_RAPIDAPI_HOST`: قيمة `X-RapidAPI-Host` التي يعرضها RapidAPI للـ API المشترك.
- `VITE_RAPIDAPI_ENDPOINT`: رابط endpoint الخاص بـ TikTok Scraper.

لأن التطبيق يعمل في المتصفح، يجب استخدام أسماء `VITE_`. الأسماء غير المسبوقة موجودة في `.env.example` لتوافق أي adapter يعمل على الخادم، لكن Vite لا يعرّضها للمتصفح وحدها.

عند وجود endpoint مضبوط، يرسل التطبيق:

- `X-RapidAPI-Key` من `VITE_RAPIDAPI_KEY`.
- `X-RapidAPI-Host` من `VITE_RAPIDAPI_HOST`.
- معامل `username` باسم المستخدم بعد إزالة `@`.
- معامل `count=1` إذا لم يكن موجوداً مسبقاً، مع الحفاظ على معاملات endpoint الأخرى.

يمكن استخدام `{username}` داخل endpoint بدلاً من معامل query إذا كان endpoint يحتاجه في المسار. يمكن أيضاً إدخال الإعدادات من قسم الإعدادات المتقدمة داخل التطبيق. لا تضع مفتاحاً حقيقياً في المستودع؛ مفاتيح Vite في تطبيق SPA ستكون قابلة للرؤية في المتصفح، لذا استخدم proxy خادماً إذا كان المفتاح يجب أن يبقى سرياً.

## جلب الدولة/المنطقة

عند ترك RapidAPI Endpoint فارغاً، يحاول التطبيق بالترتيب:

1. صفحة TikTok العامة وبيانات SSR JSON المضمّنة فيها.
2. نقطة TikWM العامة كبديل بدون مفتاح.

يتم استخراج `region` أو `regionCode` أو `countryCode` (وأسماء الحقول المقابلة) من استجابة المصدر. إذا لم تُرجع المصادر دولة، يعرض التطبيق خطأ بدلاً من تخمين دولة.
