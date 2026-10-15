export function PreviewNote({ images = false }: { images?: boolean }) {
  return (
    <div className="surface mt-6 max-w-3xl space-y-2 p-4 text-sm leading-relaxed muted sm:p-5">
      <p>
         <span className="text-[#cba0a5]">Storefront preview.</span> Cart, favorites, and saved drafts stay in this browser.
         Product detail pages also offer a separate live order request when delivery settings are configured; no online payment is taken.
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
