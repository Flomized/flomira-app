import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getProducts } from '@/lib/firestore';
import WhatsAppButton from '@/components/WhatsAppButton';
import OrderForm from '@/components/OrderForm';

export const dynamic = 'force-dynamic';

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const products = await getProducts();
  const product = products.find((p) => p.id === params.id);

  if (!product) {
    return {
      title: 'Product Not Found',
    };
  }

  return {
    title: `${product.name} - Flomira`,
    description: product.description || `Order ${product.name} from Flomira`,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const products = await getProducts();
  const product = products.find((p) => p.id === params.id);

  if (!product) {
    notFound();
  }

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <Link
            href="/products"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Products
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Images */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative h-96 bg-gray-200 rounded-2xl overflow-hidden">
                {product.images && product.images.length > 0 ? (
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No Image Available
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {product.images && product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-4">
                  {product.images.slice(1, 5).map((image, index) => (
                    <div
                      key={index}
                      className="relative h-24 bg-gray-200 rounded-lg overflow-hidden"
                    >
                      <Image
                        src={image}
                        alt={`${product.name} ${index + 2}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Product Details */}
              <div className="bg-white rounded-2xl shadow-md p-6 mt-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {product.name}
                </h1>

                {product.description && (
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {product.description}
                  </p>
                )}

                {/* Sizes and Prices */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Available Sizes
                  </h3>
                  <div className="space-y-3">
                    {product.sizes.map((size) => (
                      <div
                        key={size.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-gray-700 font-medium">
                          {size.name}
                        </span>
                        <span className="text-blue-600 font-bold text-lg">
                          {size.price.toFixed(2)} TK
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Allergens Warning */}
                {product.allergens && product.allergens.length > 0 && (
                  <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-orange-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-orange-700">
                          <span className="font-medium">Allergen Warning:</span>{' '}
                          This product contains {product.allergens.join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Form */}
            <div className="lg:sticky lg:top-8 h-fit">
              <OrderForm product={product} />
            </div>
          </div>
        </div>
      </main>

      <WhatsAppButton />
    </>
  );
}
