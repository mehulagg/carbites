import { CarWriter } from '@ipld/car'

/**
 * @typedef {import('@ipld/car').CarReader} CarReader
 */

export class TreewalkCarJoiner {
  /**
   * @param {Iterable<CarReader>} cars
   */
  constructor (cars) {
    /** @type {import('@ipld/car').CarReader[]} */
    this._cars = Array.from(cars)
    if (!this._cars.length) throw new Error('missing CARs')
  }

  async * car () {
    const reader = this._cars[0]
    const roots = await reader.getRoots()
    const { writer, out } = CarWriter.create(roots)
    const writeCar = async () => {
      const written = new Set()
      const writeBlocks = async (/** @type {CarReader} */ reader) => {
        for await (const b of reader.blocks()) {
          if (written.has(b.cid.toString())) continue
          await writer.put(b)
          written.add(b.cid.toString())
        }
      }
      try {
        await writeBlocks(reader)
        for (const reader of this._cars.slice(1)) {
          await writeBlocks(reader)
        }
      } catch (err) {
        console.error(err) // TODO: how to forward this on?
      } finally {
        await writer.close()
      }
    }

    writeCar()
    yield * out
  }
}
