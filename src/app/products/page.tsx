import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getProducts } from '@/lib/firestore';
import WhatsAppButton from '@/components/WhatsAppButton';

export const metadata: Metadata = {
  title: 'Products - Flomira',
  description: 'Browse our delicious products',
};

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4 py-16">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Our Products
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover our carefully crafted selection of delicious treats
            </p>
          </div>

          {/* Products Grid */}
          {products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-xl text-gray-500">No products available yet</p>
              <p className="text-sm text-gray-400 mt-2">Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="group"
                >
                  <div className="bg-white rounded-2xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                    {/* Product Image */}
                    <div className="relative h-64 bg-gray-200">
                      {product.images && product.images.length > 0 ? (
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {product.name}
                      </h3>

                      {product.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {product.description}
                        </p>
                      )}

                      {/* Sizes and Prices */}
                      <div className="space-y-2 mb-4">
                        {product.sizes.map((size) => (
                          <div
                            key={size.id}
                            className="flex justify-between items-center text-sm"
                          >
                            <span className="text-gray-700 font-medium">
                              {size.name}
                            </span>
                            <span className="text-blue-600 font-semibold">
                              {size.price.toFixed(2)} TK
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Allergens */}
                      {product.allergens && product.allergens.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-orange-600 font-medium">
                            ⚠️ Contains: {product.allergens.join(', ')}
                          </p>
                        </div>
                      )}

                      {/* Order Button */}
                      <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                        Order Now
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <WhatsAppButton />
    </>
  );
}
