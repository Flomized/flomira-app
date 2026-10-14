export function PreviewNote({ images = false }: { images?: boolean }) {
  return (
    <div className="max-w-3xl space-y-2 text-sm leading-relaxed text-[#aaaaaa]">
      <p>
        <span className="text-[#cba0a5]">Storefront preview.</span> All products, USD prices,
        flavors, portions, allergens, and lead times are sample information. No orders or payments are taken.
      </p>
      {images && (
        <p>
          Editorial photographs illustrate the collection and may be repeated. They are not photographs
          of each finished product.
        </p>
      )}
    </div>
  );
}
